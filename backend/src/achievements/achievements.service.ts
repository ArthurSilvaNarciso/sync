import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserAchievement,
  AchievementType,
  ACHIEVEMENT_INFO,
} from './entities/achievement.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Match } from '../matching/entities/match.entity';
import { Like } from '../matching/entities/like.entity';
import { Event } from '../events/entities/event.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(UserAchievement)
    private readonly achievementRepository: Repository<UserAchievement>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Retorna todas as conquistas do usuário com detalhes
  async getUserAchievements(userId: string) {
    const unlocked = await this.achievementRepository.find({
      where: { user_id: userId },
      order: { unlockedAt: 'DESC' },
    });

    return unlocked.map((achievement) => ({
      id: achievement.id,
      type: achievement.type,
      unlockedAt: achievement.unlockedAt,
      ...ACHIEVEMENT_INFO[achievement.type],
    }));
  }

  // Verifica todas as condições e desbloqueia conquistas novas.
  // Usa queries aggregadas em vez de carregar TODAS as atividades na memória.
  async checkAndUnlock(userId: string) {
    const existing = await this.achievementRepository.find({
      where: { user_id: userId },
    });
    const unlockedTypes = new Set(existing.map((a) => a.type));
    const newlyUnlocked: UserAchievement[] = [];

    // Agrega contagem + distância + pace + velocidade em uma query
    const aggRow = await this.activityRepository
      .createQueryBuilder('a')
      .select('COUNT(a.id)', 'activitiesCount')
      .addSelect('COALESCE(SUM(a.distance), 0)', 'totalDistance')
      .addSelect('COUNT(DISTINCT a.sport)', 'distinctSports')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.isCompleted = :c', { c: true })
      .getRawOne<{
        activitiesCount: string;
        totalDistance: string;
        distinctSports: string;
      }>();

    const activitiesCount = parseInt(aggRow?.activitiesCount ?? '0', 10);
    const totalDistanceKm = parseFloat(aggRow?.totalDistance ?? '0') / 1000;
    const distinctSportCount = parseInt(aggRow?.distinctSports ?? '0', 10);

    // Conquistas por contagem de atividades
    const activityChecks: { type: AchievementType; threshold: number }[] = [
      { type: AchievementType.FIRST_ACTIVITY, threshold: 1 },
      { type: AchievementType.ACTIVITIES_10, threshold: 10 },
      { type: AchievementType.ACTIVITIES_50, threshold: 50 },
      { type: AchievementType.ACTIVITIES_100, threshold: 100 },
    ];
    for (const check of activityChecks) {
      if (!unlockedTypes.has(check.type) && activitiesCount >= check.threshold) {
        const achievement = await this.unlockAchievement(userId, check.type);
        newlyUnlocked.push(achievement);
        unlockedTypes.add(check.type);
      }
    }

    // Conquistas por distância total
    const distanceChecks: { type: AchievementType; threshold: number }[] = [
      { type: AchievementType.DISTANCE_10K, threshold: 10 },
      { type: AchievementType.DISTANCE_50K, threshold: 50 },
      { type: AchievementType.DISTANCE_100K, threshold: 100 },
      { type: AchievementType.DISTANCE_500K, threshold: 500 },
    ];
    for (const check of distanceChecks) {
      if (!unlockedTypes.has(check.type) && totalDistanceKm >= check.threshold) {
        const achievement = await this.unlockAchievement(userId, check.type);
        newlyUnlocked.push(achievement);
        unlockedTypes.add(check.type);
      }
    }

    // Multi-sport: 3 esportes distintos (já temos no aggRow)
    if (!unlockedTypes.has(AchievementType.MULTI_SPORT) && distinctSportCount >= 3) {
      const achievement = await this.unlockAchievement(userId, AchievementType.MULTI_SPORT);
      newlyUnlocked.push(achievement);
      unlockedTypes.add(AchievementType.MULTI_SPORT);
    }

    // Contagens paralelas: matches, events, super likes
    const [matchesCount, eventsCreatedCount, superLikesCount] = await Promise.all([
      this.matchRepository
        .createQueryBuilder('match')
        .where('match.user1_id = :userId OR match.user2_id = :userId', { userId })
        .getCount(),
      this.eventRepository.count({ where: { creator_id: userId } }),
      this.likeRepository.count({ where: { from_user_id: userId, isSuperLike: true } }),
    ]);

    const socialChecks: { type: AchievementType; value: number; threshold: number }[] = [
      { type: AchievementType.FIRST_MATCH, value: matchesCount, threshold: 1 },
      { type: AchievementType.SOCIAL_BUTTERFLY, value: matchesCount, threshold: 10 },
      { type: AchievementType.FIRST_EVENT, value: eventsCreatedCount, threshold: 1 },
      { type: AchievementType.EVENT_CREATOR, value: eventsCreatedCount, threshold: 5 },
      { type: AchievementType.SUPER_LIKER, value: superLikesCount, threshold: 10 },
    ];
    for (const check of socialChecks) {
      if (!unlockedTypes.has(check.type) && check.value >= check.threshold) {
        const achievement = await this.unlockAchievement(userId, check.type);
        newlyUnlocked.push(achievement);
        unlockedTypes.add(check.type);
      }
    }

    // Streaks — datas distintas dos últimos 2 anos (evita varredura ilimitada)
    if (
      !unlockedTypes.has(AchievementType.STREAK_3) ||
      !unlockedTypes.has(AchievementType.STREAK_7) ||
      !unlockedTypes.has(AchievementType.STREAK_30)
    ) {
      const currentStreak = await this.computeCurrentStreak(userId);
      const streakChecks: { type: AchievementType; threshold: number }[] = [
        { type: AchievementType.STREAK_3, threshold: 3 },
        { type: AchievementType.STREAK_7, threshold: 7 },
        { type: AchievementType.STREAK_30, threshold: 30 },
      ];
      for (const check of streakChecks) {
        if (!unlockedTypes.has(check.type) && currentStreak >= check.threshold) {
          const achievement = await this.unlockAchievement(userId, check.type);
          newlyUnlocked.push(achievement);
          unlockedTypes.add(check.type);
        }
      }
    }

    // Speed demon — EXISTS query (não carrega todas)
    if (!unlockedTypes.has(AchievementType.SPEED_DEMON)) {
      const fastOne = await this.activityRepository
        .createQueryBuilder('a')
        .select('a.id')
        .where('a.user_id = :userId', { userId })
        .andWhere('a.isCompleted = :c', { c: true })
        .andWhere('a.avgSpeed > :speed', { speed: 15 })
        .limit(1)
        .getRawOne();
      if (fastOne) {
        const achievement = await this.unlockAchievement(userId, AchievementType.SPEED_DEMON);
        newlyUnlocked.push(achievement);
        unlockedTypes.add(AchievementType.SPEED_DEMON);
      }
    }

    // Early bird — atividade antes das 6h (SQLite: strftime('%H'))
    if (!unlockedTypes.has(AchievementType.EARLY_BIRD)) {
      const earlyOne = await this.activityRepository
        .createQueryBuilder('a')
        .select('a.id')
        .where('a.user_id = :userId', { userId })
        .andWhere('a.isCompleted = :c', { c: true })
        .andWhere("CAST(strftime('%H', a.startTime) AS INTEGER) < 6")
        .limit(1)
        .getRawOne();
      if (earlyOne) {
        const achievement = await this.unlockAchievement(userId, AchievementType.EARLY_BIRD);
        newlyUnlocked.push(achievement);
        unlockedTypes.add(AchievementType.EARLY_BIRD);
      }
    }

    // Night owl — atividade após as 22h
    if (!unlockedTypes.has(AchievementType.NIGHT_OWL)) {
      const nightOne = await this.activityRepository
        .createQueryBuilder('a')
        .select('a.id')
        .where('a.user_id = :userId', { userId })
        .andWhere('a.isCompleted = :c', { c: true })
        .andWhere("CAST(strftime('%H', a.startTime) AS INTEGER) >= 22")
        .limit(1)
        .getRawOne();
      if (nightOne) {
        const achievement = await this.unlockAchievement(userId, AchievementType.NIGHT_OWL);
        newlyUnlocked.push(achievement);
        unlockedTypes.add(AchievementType.NIGHT_OWL);
      }
    }

    return newlyUnlocked.map((achievement) => ({
      id: achievement.id,
      type: achievement.type,
      unlockedAt: achievement.unlockedAt,
      ...ACHIEVEMENT_INFO[achievement.type],
    }));
  }

  // Soma XP de todas as conquistas desbloqueadas
  async getUserXP(userId: string) {
    const achievements = await this.achievementRepository.find({
      where: { user_id: userId },
    });

    const totalXP = achievements.reduce(
      (sum, a) => sum + (ACHIEVEMENT_INFO[a.type]?.xp || 0),
      0,
    );

    return {
      totalXP,
      level: this.calculateLevel(totalXP),
      achievementsCount: achievements.length,
      totalAchievements: Object.keys(AchievementType).length,
    };
  }

  // Calcula nível a partir do XP (cada 500 XP = 1 nível)
  getUserLevel(xp: number) {
    return this.calculateLevel(xp);
  }

  private calculateLevel(xp: number): number {
    return Math.floor(xp / 500) + 1;
  }

  private async unlockAchievement(
    userId: string,
    type: AchievementType,
  ): Promise<UserAchievement> {
    const achievement = this.achievementRepository.create({
      user_id: userId,
      type,
    });
    const saved = await this.achievementRepository.save(achievement);

    // Disparar notificação ao desbloquear conquista
    const info = ACHIEVEMENT_INFO[type];
    if (info) {
      await this.notificationsService.create(
        userId,
        NotificationType.ACHIEVEMENT_UNLOCKED,
        `${info.icon} Conquista desbloqueada!`,
        `Você desbloqueou "${info.name}": ${info.description} (+${info.xp} XP)`,
        JSON.stringify({ achievementType: type }),
      );
    }

    return saved;
  }

  // Streak atual via datas distintas (limitado a 2 anos)
  private async computeCurrentStreak(userId: string): Promise<number> {
    const rows = await this.activityRepository
      .createQueryBuilder('a')
      .select('DATE(a.startTime)', 'activityDate')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.isCompleted = :c', { c: true })
      .andWhere('a.startTime > :since', {
        since: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
      })
      .groupBy('DATE(a.startTime)')
      .orderBy('activityDate', 'DESC')
      .getRawMany<{ activityDate: string }>();

    if (rows.length === 0) return 0;

    const sortedDates = rows.map((r) => r.activityDate);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const curr = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      const diffDays = Math.round((curr.getTime() - next.getTime()) / 86400000);
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
}
