import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventParticipant } from './entities/event-participant.entity';
import { EventComment } from './entities/event-comment.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { haversineKm } from '../common/utils/haversine';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventParticipant)
    private readonly participantRepository: Repository<EventParticipant>,
    @InjectRepository(EventComment)
    private readonly commentRepository: Repository<EventComment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateEventDto): Promise<Event> {
    const event = this.eventRepository.create({
      ...dto,
      creator_id: userId,
    });
    return this.eventRepository.save(event);
  }

  // KILLER FEATURE: Evento relâmpago.
  // Cria evento começando em ~15min e dispara push pra usuários no raio.
  async createFlash(
    userId: string,
    dto: {
      sport: string;
      latitude: number;
      longitude: number;
      address?: string;
      maxParticipants?: number;
      startsInMinutes?: number;
      title?: string;
      radiusKm?: number;
    },
  ): Promise<Event & { notifiedCount: number }> {
    const startsInMin = Math.min(Math.max(dto.startsInMinutes ?? 15, 5), 120);
    const date = new Date(Date.now() + startsInMin * 60_000);
    const creator = await this.userRepository.findOne({ where: { id: userId } });

    const event = this.eventRepository.create({
      title: dto.title || `${dto.sport} relâmpago em ${startsInMin}min`,
      description: `Evento relâmpago criado por ${creator?.name || 'um atleta'}. Bora!`,
      sport: dto.sport,
      date,
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address,
      maxParticipants: dto.maxParticipants ?? 12,
      isFlash: true,
      creator_id: userId,
    });
    const saved = await this.eventRepository.save(event);

    // Notifica usuários no raio (exclui criador e quem não tem geo)
    const radiusKm = Math.min(Math.max(dto.radiusKm ?? 5, 1), 25);
    const nearbyUsers = await this.userRepository.find({
      where: { isActive: true },
      select: ['id', 'latitude', 'longitude', 'sports'],
    });

    const targets = nearbyUsers.filter((u) => {
      if (u.id === userId) return false;
      if (u.latitude == null || u.longitude == null) return false;
      const d = haversineKm(dto.latitude, dto.longitude, u.latitude, u.longitude);
      if (d > radiusKm) return false;
      // Filtra por esporte se o usuário declarou esportes — match opcional
      if (u.sports && u.sports.length > 0 && !u.sports.includes(dto.sport)) return false;
      return true;
    });

    await Promise.allSettled(
      targets.map((u) =>
        this.notificationsService.create(
          u.id,
          NotificationType.NEW_EVENT_NEARBY,
          `⚡ ${dto.sport} relâmpago a ${radiusKm}km`,
          `${creator?.name || 'Alguém'} começa em ${startsInMin}min. Você vai?`,
          JSON.stringify({ eventId: saved.id, flash: true }),
        ),
      ),
    );

    return Object.assign(saved, { notifiedCount: targets.length });
  }

  // Buscar eventos proximos por localizacao (Haversine em JS)
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    sport?: string,
  ) {
    let qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.creator', 'creator')
      .where('event.date > :now', { now: new Date().toISOString() });

    if (sport) {
      qb = qb.andWhere('event.sport = :sport', { sport });
    }

    const allEvents = await qb.orderBy('event.date', 'ASC').getMany();

    // Calcular distancia e filtrar por raio
    return allEvents
      .map((event) => ({
        ...event,
        distance: haversineKm(latitude, longitude, event.latitude, event.longitude),
      }))
      .filter((e) => e.distance <= radiusKm)
      .map((e) => ({ ...e, distance: Math.round(e.distance * 10) / 10 }));
  }

  async findById(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['creator', 'participants', 'participants.user'],
    });
    if (!event) {
      throw new NotFoundException('Evento nao encontrado');
    }
    return event;
  }

  async join(userId: string, eventId: string): Promise<void> {
    const event = await this.findById(eventId);

    if (event.participants.length >= event.maxParticipants) {
      throw new BadRequestException('Evento lotado');
    }

    const existing = await this.participantRepository.findOne({
      where: { user_id: userId, event_id: eventId },
    });
    if (existing) {
      throw new BadRequestException('Voce ja participa deste evento');
    }

    await this.participantRepository.save({
      user_id: userId,
      event_id: eventId,
    });
  }

  async leave(userId: string, eventId: string): Promise<void> {
    const result = await this.participantRepository.delete({
      user_id: userId,
      event_id: eventId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Participacao nao encontrada');
    }
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Evento nao encontrado');
    }
    if (event.creator_id !== userId) {
      throw new ForbiddenException('Apenas o criador pode cancelar o evento');
    }
    await this.eventRepository.delete(eventId);
  }

  async getMyEvents(userId: string) {
    const created = await this.eventRepository.find({
      where: { creator_id: userId },
      order: { date: 'ASC' },
    });

    const participating = await this.participantRepository.find({
      where: { user_id: userId },
      relations: ['event', 'event.creator'],
    });

    const now = new Date();
    return {
      created: created.filter((e) => new Date(e.date) > now),
      participating: participating
        .map((p) => p.event)
        .filter((e) => new Date(e.date) > now),
    };
  }

  // Adicionar comentário a um evento
  async addComment(eventId: string, userId: string, content: string): Promise<EventComment> {
    await this.findById(eventId);

    const comment = this.commentRepository.create({
      event_id: eventId,
      user_id: userId,
      content,
    });
    return this.commentRepository.save(comment);
  }

  // Buscar comentários paginados de um evento
  async getComments(eventId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await this.commentRepository.findAndCount({
      where: { event_id: eventId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          avatarUrl: comment.user.avatarUrl,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Deletar comentário (apenas o autor pode deletar)
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('Você só pode deletar seus próprios comentários');
    }

    await this.commentRepository.delete(commentId);
  }
}
