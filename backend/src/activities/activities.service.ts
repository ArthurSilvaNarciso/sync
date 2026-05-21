import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityPoint } from './entities/activity-point.entity';
import { ActivityComment } from './entities/activity-comment.entity';
import { ActivityKudos } from './entities/activity-kudos.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { AddPointDto } from './dto/add-point.dto';
import { haversineMeters } from '../common/utils/haversine';

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
  ) {}

  // === COMMENTS ===
  async addComment(activityId: string, userId: string, content: string): Promise<ActivityComment> {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    const trimmed = content?.trim();
    if (!trimmed || trimmed.length > 500) {
      throw new BadRequestException('Comentário inválido (1-500 chars)');
    }
    return this.commentRepository.save(
      this.commentRepository.create({ activity_id: activityId, user_id: userId, content: trimmed }),
    );
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
  async createShareToken(userId: string, activityId: string): Promise<{ liveToken: string; url: string }> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, user_id: userId },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    if (activity.isCompleted) throw new BadRequestException('Atividade já finalizada');

    const token = activity.liveToken || this.randomToken(16);
    if (!activity.liveToken) {
      await this.activityRepository.update(activityId, { liveToken: token });
    }
    return { liveToken: token, url: `/live/${token}` };
  }

  // Revoga compartilhamento
  async revokeShare(userId: string, activityId: string): Promise<void> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, user_id: userId },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    await this.activityRepository.update(activityId, { liveToken: null });
  }

  // Busca atividade ao vivo por token (rota pública)
  async getLiveByToken(token: string) {
    const activity = await this.activityRepository.findOne({
      where: { liveToken: token },
      relations: ['user', 'points'],
    });
    if (!activity) throw new NotFoundException('Live não encontrado');
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
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
}
