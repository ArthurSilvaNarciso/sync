import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityPoint } from './entities/activity-point.entity';
import { ActivityComment } from './entities/activity-comment.entity';
import { ActivityKudos } from './entities/activity-kudos.entity';
import { ActivityRating } from './entities/activity-rating.entity';
import { CommentReaction } from './entities/comment-reaction.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { AddPointDto } from './dto/add-point.dto';
import { haversineMeters } from '../common/utils/haversine';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../notifications/push.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { sanitizeText } from '../common/security/sanitize.util';
import { extractMentions } from '../common/utils/mentions.util';
import { User } from '../users/entities/user.entity';
import { GroupsService } from '../groups/groups.service';
import { ILike, In } from 'typeorm';

// Lista branca de emoji-reaction permitidas (curto, validado)
const ALLOWED_REACTIONS = new Set(['❤️', '🔥', '💪', '🚀', '👏', '🙌', '😂', '🎉']);

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
    @InjectRepository(CommentReaction)
    private readonly reactionRepository: Repository<CommentReaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
    private readonly groupsService: GroupsService,
  ) {}

  // ===== MENTIONS HELPERS =====
  private async resolveMentionsToUserIds(text: string, excludeUserId: string): Promise<string[]> {
    const usernames = extractMentions(text);
    if (usernames.length === 0) return [];
    // Resolve por nome (partial match case-insensitive, primeira palavra prioritária)
    const ids = new Set<string>();
    for (const u of usernames) {
      const user = await this.userRepository.findOne({
        where: [
          { name: ILike(u) },
          { name: ILike(`${u} %`) },
          { name: ILike(`% ${u} %`) },
          { name: ILike(`% ${u}`) },
        ],
        select: ['id'],
      });
      if (user && user.id !== excludeUserId) ids.add(user.id);
    }
    return Array.from(ids);
  }

  private async notifyMentions(mentionedIds: string[], commenterId: string, activityId: string, commentId: string, preview: string) {
    if (mentionedIds.length === 0) return;
    await Promise.allSettled(
      mentionedIds.map(uid =>
        Promise.all([
          this.notificationsService.create(
            uid,
            NotificationType.NEW_MESSAGE,
            'Você foi mencionado',
            preview,
            JSON.stringify({ activityId, commentId, mentionFrom: commenterId }),
          ),
          this.pushService.sendToUser(uid, '@menção 💬', preview, { type: 'mention', activityId, commentId }),
        ])
      )
    );
  }

  // === COMMENTS ===
  async addComment(activityId: string, userId: string, content: string): Promise<ActivityComment> {
    const activity = await this.activityRepository.findOne({ where: { id: activityId }, relations: ['user'] });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    const clean = sanitizeText(content, 500);
    if (!clean) {
      throw new BadRequestException('Comentário inválido');
    }

    // Resolve menções a IDs de usuário (ignora o próprio comentarista)
    const mentionedIds = await this.resolveMentionsToUserIds(clean, userId);

    const saved = await this.commentRepository.save(
      this.commentRepository.create({
        activity_id: activityId,
        user_id: userId,
        content: clean,
        mentioned_user_ids: mentionedIds,
      }),
    );

    const preview = clean.length > 60 ? clean.slice(0, 60) + '…' : clean;

    // Notifica dono da atividade (se não foi ele próprio que comentou e não está nas menções pra evitar duplicar)
    if (activity.user_id !== userId && !mentionedIds.includes(activity.user_id)) {
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

    // Notifica menções (async, não bloqueia resposta)
    this.notifyMentions(mentionedIds, userId, activityId, saved.id, preview).catch(() => {});

    return saved;
  }

  async listComments(activityId: string, viewerId?: string) {
    const comments = await this.commentRepository.find({
      where: { activity_id: activityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    if (comments.length === 0) return [];
    const ids = comments.map(c => c.id);
    const reactions = await this.reactionRepository.find({ where: { comment_id: In(ids) } });
    // agrega por (comment_id, emoji)
    type Agg = { count: number; mine: boolean };
    const map = new Map<string, Map<string, Agg>>();
    for (const r of reactions) {
      if (!map.has(r.comment_id)) map.set(r.comment_id, new Map());
      const inner = map.get(r.comment_id)!;
      const cur = inner.get(r.emoji) || { count: 0, mine: false };
      cur.count++;
      if (viewerId && r.user_id === viewerId) cur.mine = true;
      inner.set(r.emoji, cur);
    }
    return comments.map(c => ({
      ...c,
      reactions: map.has(c.id)
        ? Array.from(map.get(c.id)!.entries()).map(([emoji, agg]) => ({ emoji, count: agg.count, mine: agg.mine }))
        : [],
    }));
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.user_id !== userId) throw new BadRequestException('Sem permissão');
    await this.commentRepository.delete(commentId);
  }

  // === COMMENT REACTIONS ===
  async toggleReaction(commentId: string, userId: string, emoji: string): Promise<{ added: boolean; count: number; emoji: string }> {
    const clean = (emoji || '').trim();
    if (!ALLOWED_REACTIONS.has(clean)) {
      throw new BadRequestException('Emoji não permitido');
    }
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');

    const existing = await this.reactionRepository.findOne({
      where: { comment_id: commentId, user_id: userId, emoji: clean },
    });
    let added: boolean;
    if (existing) {
      await this.reactionRepository.delete(existing.id);
      added = false;
    } else {
      await this.reactionRepository.save(
        this.reactionRepository.create({ comment_id: commentId, user_id: userId, emoji: clean }),
      );
      added = true;
      // Notifica autor do comentário (silencioso)
      if (comment.user_id !== userId) {
        this.pushService
          .sendToUser(comment.user_id, `Reação ${clean}`, 'Alguém reagiu ao seu comentário', { type: 'comment_reaction', commentId })
          .catch(() => {});
      }
    }
    const count = await this.reactionRepository.count({ where: { comment_id: commentId, emoji: clean } });
    return { added, count, emoji: clean };
  }

  async listReactions(commentId: string) {
    const rows = await this.reactionRepository.find({
      where: { comment_id: commentId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      take: 200,
    });
    return rows;
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
  async addPoint(activityId: string, userId: string, dto: AddPointDto): Promise<ActivityPoint> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });
    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }
    // Ownership check — impede que outro usuário injete pontos GPS em atividade alheia
    if (activity.user_id !== userId) {
      throw new BadRequestException('Sem permissão para editar esta atividade');
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

    // Credita os km nos grupos do usuário (soma contínua) — fire-and-forget
    if (distanceKm > 0) {
      this.groupsService.creditActivity(userId, distanceKm).catch(() => {});
    }

    return this.activityRepository.findOne({
      where: { id: activityId },
      relations: ['points'],
    }) as Promise<Activity>;
  }

  // Histórico de atividades do usuário
  async getUserActivities(userId: string, page: number = 1, limit: number = 20) {
    const safePage = Math.max(1, Math.min(page, 500));
    const safeLimit = Math.max(1, Math.min(limit, 50));
    return this.activityRepository.findAndCount({
      where: { user_id: userId, isCompleted: true },
      order: { startTime: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
  }

  // === LIVE CHEER === (alguém apertou "Vai!" durante seu live tracking)
  async addCheer(activityId: string) {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    if (!activity.liveToken) throw new BadRequestException('Atividade não está sendo transmitida ao vivo');
    await this.activityRepository.increment({ id: activityId }, 'cheersCount', 1);
    return { ok: true, cheersCount: activity.cheersCount + 1 };
  }

  // === COMPARAR 2 atividades lado-a-lado ===
  async compare(activity1Id: string, activity2Id: string, userId: string) {
    const [a1, a2] = await Promise.all([
      this.activityRepository.findOne({ where: { id: activity1Id } }),
      this.activityRepository.findOne({ where: { id: activity2Id } }),
    ]);
    if (!a1 || !a2) throw new NotFoundException('Uma das atividades não foi encontrada');
    if (a1.user_id !== userId && a2.user_id !== userId) {
      throw new BadRequestException('Você só pode comparar suas próprias atividades');
    }
    const km1 = (a1.distance || 0) / 1000;
    const km2 = (a2.distance || 0) / 1000;
    return {
      a1: { id: a1.id, sport: a1.sport, startTime: a1.startTime, distanceKm: km1, durationSec: a1.duration, avgPace: a1.avgPace, avgSpeed: a1.avgSpeed },
      a2: { id: a2.id, sport: a2.sport, startTime: a2.startTime, distanceKm: km2, durationSec: a2.duration, avgPace: a2.avgPace, avgSpeed: a2.avgSpeed },
      delta: {
        distanceKm: Math.round((km1 - km2) * 100) / 100,
        durationSec: a1.duration - a2.duration,
        avgPace: a1.avgPace != null && a2.avgPace != null ? Math.round((a1.avgPace - a2.avgPace) * 100) / 100 : null,
        winner: a1.avgPace != null && a2.avgPace != null ? (a1.avgPace < a2.avgPace ? 'a1' : 'a2') : null,
      },
    };
  }

  // === PHOTOS na atividade ===
  async addPhoto(activityId: string, userId: string, photoUrl: string) {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    if (activity.user_id !== userId) throw new BadRequestException('Sem permissão');
    const photos = activity.photoUrls || [];
    if (photos.length >= 5) throw new BadRequestException('Máximo 5 fotos por atividade');
    photos.push(photoUrl);
    await this.activityRepository.update(activityId, { photoUrls: photos });
    return { ok: true, photoUrls: photos };
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
      workoutType: typeof data.workoutType === 'string' ? sanitizeText(data.workoutType, 40) || null : null,
      weatherFelt: typeof data.weatherFelt === 'string' ? sanitizeText(data.weatherFelt, 40) || null : null,
      notes: typeof data.notes === 'string' ? sanitizeText(data.notes, 500) || null : null,
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
