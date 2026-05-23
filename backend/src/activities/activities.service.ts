import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityPoint } from './entities/activity-point.entity';
import { ActivityComment } from './entities/activity-comment.entity';
import { ActivityKudos } from './entities/activity-kudos.entity';
import { ActivityRating } from './entities/activity-rating.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { AddPointDto } from './dto/add-point.dto';
import { haversineMeters } from '../common/utils/haversine';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { sanitizeText } from '../common/security/sanitize.util';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(ActivityPoint)
    private readonly pointRepository: Repository<ActivityPoint>,
    @InjectRepository(ActivityComment)
    private readonly commentRepository: Repository<ActivityComment>,
    @InjectRepository(ActivityKudos)
    private readonly kudosRepository: Repository<ActivityKudos>,
    @InjectRepository(ActivityRating)
    private readonly ratingRepository: Repository<ActivityRating>,
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
  ) {}

  // === COMMENTS ===
  async addComment(activityId: string, userId: string, content: string): Promise<ActivityComment> {
    const activity = await this.activityRepository.findOne({ where: { id: activityId }, relations: ['user'] });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    const clean = sanitizeText(content, 500);
    if (!clean) {
      throw new BadRequestException('Comentário inválido');
    }
    const saved = await this.commentRepository.save(
      this.commentRepository.create({ activity_id: activityId, user_id: userId, content: clean }),
    );

    // Notifica dono da atividade (se não foi ele próprio que comentou)
    if (activity.user_id !== userId) {
      const preview = clean.length > 60 ? clean.slice(0, 60) + '…' : clean;
      Promise.all([
        this.notificationsService.create(
          activity.user_id,
          NotificationType.NEW_MESSAGE,
          'Novo comentário',
          preview,
          JSON.stringify({ activityId, commentId: saved.id }),
        ),
        this.pushService.sendToUser(
          activity.user_id,
          'Novo comentário 💬',
          preview,
          { type: 'activity_comment', activityId },
        ),
      ]).catch(() => {});
    }
    return saved;
  }

  async listComments(activityId: string) {
    return this.commentRepository.find({
      where: { activity_id: activityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.user_id !== userId) throw new BadRequestException('Sem permissão');
    await this.commentRepository.delete(commentId);
  }

  // === KUDOS (likes) ===
  async toggleKudos(activityId: string, userId: string): Promise<{ kudos: boolean; total: number }> {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    const existing = await this.kudosRepository.findOne({
      where: { activity_id: activityId, user_id: userId },
    });
    if (existing) {
      await this.kudosRepository.delete(existing.id);
      const total = await this.kudosRepository.count({ where: { activity_id: activityId } });
      return { kudos: false, total };
    } else {
      await this.kudosRepository.save(
        this.kudosRepository.create({ activity_id: activityId, user_id: userId }),
      );
      const total = await this.kudosRepository.count({ where: { activity_id: activityId } });

      // Push pro dono (silencioso, não bloqueia)
      if (activity.user_id !== userId) {
        this.pushService
          .sendToUser(
            activity.user_id,
            'Você recebeu kudos! 👏',
            'Alguém curtiu sua atividade. Confira no app.',
            { type: 'kudos', activityId },
          )
          .catch(() => {});
      }
      return { kudos: true, total };
    }
  }

  async getKudosCount(activityId: string): Promise<number> {
    return this.kudosRepository.count({ where: { activity_id: activityId } });
  }

  // Iniciar nova atividade
  async start(userId: string, dto: CreateActivityDto): Promise<Activity> {
    const activity = this.activityRepository.create({
      user_id: userId,
      sport: dto.sport,
      startTime: new Date(dto.startTime),
    });
    return this.activityRepository.save(activity);
  }

  // Adicionar ponto GPS durante a atividade
  async addPoint(activityId: string, dto: AddPointDto): Promise<ActivityPoint> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });
    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }
    if (activity.isCompleted) {
      throw new BadRequestException('Atividade já finalizada');
    }

    // Validate GPS coordinates
    if (
      dto.latitude < -90 || dto.latitude > 90 ||
      dto.longitude < -180 || dto.longitude > 180
    ) {
      throw new BadRequestException('Coordenadas GPS inválidas');
    }

    const point = this.pointRepository.create({
      activity_id: activityId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      altitude: dto.altitude,
      timestamp: new Date(dto.timestamp),
    });

    return this.pointRepository.save(point);
  }

  // Finalizar atividade - calcula métricas (distância, pace, velocidade)
  async finish(activityId: string, userId: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, user_id: userId },
      relations: ['points'],
    });

    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    // Calcular distância total usando Haversine
    const points = activity.points.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += haversineMeters(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude,
      );
    }

    const endTime = new Date();
    const durationSeconds = Math.floor(
      (endTime.getTime() - new Date(activity.startTime).getTime()) / 1000,
    );

    // Pace = minutos por km
    const distanceKm = totalDistance / 1000;
    const durationMinutes = durationSeconds / 60;
    const avgPace = distanceKm > 0 ? durationMinutes / distanceKm : 0;

    // Velocidade = km/h
    const durationHours = durationSeconds / 3600;
    const avgSpeed = durationHours > 0 ? distanceKm / durationHours : 0;

    await this.activityRepository.update(activityId, {
      endTime,
      distance: totalDistance,
      duration: durationSeconds,
      avgPace: Math.round(avgPace * 100) / 100,
      avgSpeed: Math.round(avgSpeed * 100) / 100,
      isCompleted: true,
    });

    return this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['points'],
    }) as Promise<Activity>;
  }

  // Histórico de atividades do usuário
  async getUserActivities(userId: string, page: number = 1, limit: number = 20) {
    return this.activityRepository.findAndCount({
      where: { user_id: userId, isCompleted: true },
      order: { startTime: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // === ACTIVITY RATING (pós-treino) ===
  async upsertRating(activityId: string, userId: string, data: any) {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    if (activity.user_id !== userId) throw new BadRequestException('Sem permissão');

    const existing = await this.ratingRepository.findOne({
      where: { activity_id: activityId, user_id: userId },
    });
    const clean = {
      energy: data.energy != null ? Math.max(1, Math.min(5, data.energy)) : null,
      satisfaction: data.satisfaction != null ? Math.max(1, Math.min(5, data.satisfaction)) : null,
      rpe: data.rpe != null ? Math.max(1, Math.min(10, data.rpe)) : null,
      pain: data.pain != null ? Math.max(0, Math.min(5, data.pain)) : null,
      workoutType: data.workoutType || null,
      weatherFelt: data.weatherFelt || null,
      notes: typeof data.notes === 'string' ? data.notes.slice(0, 500) : null,
    };

    if (existing) {
      await this.ratingRepository.update(existing.id, clean);
      return { ...existing, ...clean };
    }
    return this.ratingRepository.save(
      this.ratingRepository.create({ activity_id: activityId, user_id: userId, ...clean }),
    );
  }

  async getRating(activityId: string, userId: string) {
    return this.ratingRepository.findOne({
      where: { activity_id: activityId, user_id: userId },
    });
  }

  // Retorna pontos GPS de atividades próximas para gerar heatmap.
  // Sampling: 1 a cada 5 pontos por atividade pra reduzir payload.
  async getHeatmapPoints(centerLat: number, centerLng: number, radiusKm: number) {
    const dLat = radiusKm / 111;
    const dLng = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));
    const activities = await this.activityRepository
      .createQueryBuilder('a')
      .leftJoin('a.points', 'p')
      .where('a.isCompleted = :done', { done: true })
      .andWhere('p.latitude BETWEEN :latMin AND :latMax', {
        latMin: centerLat - dLat,
        latMax: centerLat + dLat,
      })
      .andWhere('p.longitude BETWEEN :lngMin AND :lngMax', {
        lngMin: centerLng - dLng,
        lngMax: centerLng + dLng,
      })
      .select(['a.id', 'p.latitude', 'p.longitude'])
      .limit(5000)
      .getRawMany();

    // Subsample: 1 a cada 5
    const points: Array<[number, number]> = [];
    for (let i = 0; i < activities.length; i += 5) {
      const lat = activities[i].p_latitude;
      const lng = activities[i].p_longitude;
      if (lat != null && lng != null) points.push([lat, lng]);
    }
    return points;
  }

  // Detalhes de uma atividade com todos os pontos (para desenhar rota)
  async getActivityDetail(activityId: string) {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['points'],
    });
    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    // Ordenar pontos por timestamp
    activity.points.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return activity;
  }

  // Gera token público para compartilhar tracking ao vivo
  async createShareToken(userId: string, activityId: string): Promise<{ liveToken: string; url: string; expiresAt: Date }> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, user_id: userId },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    if (activity.isCompleted) throw new BadRequestException('Atividade já finalizada');

    const token = activity.liveToken || this.randomToken(24);
    // Expira em 24h
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.activityRepository.update(activityId, {
      liveToken: token,
      liveTokenExpiresAt: expiresAt,
    });
    return { liveToken: token, url: `/live/${token}`, expiresAt };
  }

  // Revoga compartilhamento
  async revokeShare(userId: string, activityId: string): Promise<void> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, user_id: userId },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    await this.activityRepository.update(activityId, { liveToken: null, liveTokenExpiresAt: null });
  }

  // Busca atividade ao vivo por token (rota pública) — valida expiração
  async getLiveByToken(token: string) {
    const activity = await this.activityRepository.findOne({
      where: { liveToken: token },
      relations: ['user', 'points'],
    });
    if (!activity) throw new NotFoundException('Live não encontrado');
    // Expirado?
    if (activity.liveTokenExpiresAt && activity.liveTokenExpiresAt < new Date()) {
      // Auto-revoga
      await this.activityRepository.update(activity.id, { liveToken: null, liveTokenExpiresAt: null });
      throw new NotFoundException('Live expirou');
    }
    // Auto-revoga se atividade finalizou há mais de 30 min
    if (activity.isCompleted && activity.endTime &&
        Date.now() - new Date(activity.endTime).getTime() > 30 * 60 * 1000) {
      await this.activityRepository.update(activity.id, { liveToken: null, liveTokenExpiresAt: null });
      throw new NotFoundException('Live expirou');
    }
    activity.points.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    // Retorna apenas dados públicos do dono
    return {
      activityId: activity.id,
      sport: activity.sport,
      startTime: activity.startTime,
      isCompleted: activity.isCompleted,
      distance: activity.distance,
      duration: activity.duration,
      points: activity.points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp,
      })),
      athlete: { name: activity.user?.name, avatarUrl: activity.user?.avatarUrl },
    };
  }

  private randomToken(len: number): string {
    // Crypto-secure: usa crypto.randomBytes (lazy require pra evitar import top-level)
    try {
      const crypto = require('crypto');
      return crypto.randomBytes(len).toString('hex').slice(0, len * 2);
    } catch {}
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
}
