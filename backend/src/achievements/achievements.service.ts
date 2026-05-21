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

  // Verifica todas as condições e desbloqueia conquistas novas
  async checkAndUnlock(userId: string) {
    const existing = await this.achievementRepository.find({
      where: { user_id: userId },
    });
    const unlockedTypes = new Set(existing.map((a) => a.type));
    const newlyUnlocked: UserAchievement[] = [];

    // Buscar dados necessários
    const completedActivities = await this.activityRepository.find({
      where: { user_id: userId, isCompleted: true },
      order: { startTime: 'ASC' },
    });

    const activitiesCount = completedActivities.length;
    const totalDistance = completedActivities.reduce(
      (sum, a) => sum + (a.distance || 0),
      0,
    );
    const totalDistanceKm = totalDistance / 1000;

    // Matches count
    const matchesCount = await this.matchRepository
      .createQueryBuilder('match')
      .where('match.user1_id = :userId OR match.user2_id = :userId', {
        userId,
      })
      .getCount();

    // Events created count
    const eventsCreatedCount = await this.eventRepository.count({
      where: { creator_id: userId },
    });

    // Super likes count
    const superLikesCount = await this.likeRepository.count({
      where: { from_user_id: userId, isSuperLike: true },
    });

    // Conquistas baseadas em contagem de atividades
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

    // Conquistas baseadas em distância (em km)
    const distanceChecks: { type: AchievementType; threshold: number }[] = [
      { type: AchievementType.DISTANCE_10K, threshold: 10 },
      { type: AchievementType.DISTANCE_50K, threshold: 50 },
      { type: AchievementType.DISTANCE_100K, threshold: 100 },
      { type: AchievementType.DISTANCE_500K, threshold: 500 },
    ];

    for (const check of distanceChecks) {
      if (
        !unlockedTypes.has(check.type) &&
        totalDistanceKm >= check.threshold
      ) {
        const achievement = await this.unlockAchievement(userId, check.type);
        newlyUnlocked.push(achievement);
        unlockedTypes.add(check.type);
      }
    }

    // First match
    if (!unlockedTypes.has(AchievementType.FIRST_MATCH) && matchesCount >= 1) {
      const achievement = await this.unlockAchievement(
        userId,
        AchievementType.FIRST_MATCH,
      );
      newlyUnlocked.push(achievement);
      unlockedTypes.add(AchievementType.FIRST_MATCH);
    }

    // Social butterfly (10 matches)
    if (
      !unlockedTypes.has(AchievementType.SOCIAL_BUTTERFLY) &&
      matchesCount >= 10
    ) {
      const achievement = await this.unlockAchievement(
        userId,
        AchievementType.SOCIAL_BUTTERFLY,
      );
      newlyUnlocked.push(achievement);
      unlockedTypes.add(AchievementType.SOCIAL_BUTTERFLY);
    }

    // First event
    if (
      !unlockedTypes.has(AchievementType.FIRST_EVENT) &&
      eventsCreatedCount >= 1
    ) {
      const achievement = await this.unlockAchievement(
        userId,
        AchievementType.FIRST_EVENT,
      );
      newlyUnlocked.push(achievement);
      unlockedTypes.add(AchievementType.FIRST_EVENT);
    }

    // Event creator (5 events)
    if (
      !unlockedTypes.has(AchievementType.EVENT_CREATOR) &&
      eventsCreatedCount >= 5
    ) {
      const achievement = await this.unlockAchievement(
        userId,
        AchievementType.EVENT_CREATOR,
      );
      newlyUnlocked.push(achievement);
      unlockedTypes.add(AchievementType.EVENT_CREATOR);
    }

    // Super liker (10 super likes)
    if (
      !unlockedTypes.has(AchievementType.SUPER_LIKER) &&
      superLikesCount >= 10
    ) {
      const achievement = await this.unlockAchievement(
        userId,
        AchievementType.SUPER_LIKER,
      );
      newlyUnlocked.push(achievement);
      unlockedTypes.add(AchievementType.SUPER_LIKER);
    }

    // Streaks (dias consecutivos com atividades completadas)
    if (
      !unlockedTypes.has(AchievementType.STREAK_3) ||
      !unlockedTypes.has(AchievementType.STREAK_7) ||
      !unlockedTypes.has(AchievementType.STREAK_30)
    ) {
      const currentStreak = this.calculateCurrentStreak(completedActivities);

      const streakChecks: { type: AchievementType; threshold: number }[] = [
        { type: AchievementType.STREAK_3, threshold: 3 },
        { type: AchievementType.STREAK_7, threshold: 7 },
        { type: AchievementType.STREAK_30, threshold: 30 },
      ];

      for (const check of streakChecks) {
        if (
          !unlockedTypes.has(check.type) &&
          currentStreak >= check.threshold
        ) {
          const achievement = await this.unlockAchievement(userId, check.type);
          newlyUnlocked.push(achievement);
          unlockedTypes.add(check.type);
        }
      }
    }

    // Speed demon (velocidade média acima de 15km/h)
    if (!unlockedTypes.has(AchievementType.SPEED_DEMON)) {
      const hasHighSpeed = completedActivities.some(
        (a) => a.avgSpeed && a.avgSpeed > 15,
      );
      if (hasHighSpeed) {
        const achievement = await this.unlockAchievement(
          userId,
          AchievementType.SPEED_DEMON,
        );
        newlyUnlocked.push(achievement);
        unlockedTypes.add(AchievementType.SPEED_DEMON);
      }
    }

    // Early bird (atividade antes das 6h)
    if (!unlockedTypes.has(AchievementType.EARLY_BIRD)) {
      const hasEarlyActivity = completedActivities.some((a) => {
        const hour = new Date(a.startTime).getHours();
        return hour < 6;
      });
      if (hasEarlyActivity) {
        const achievement = await this.unlockAchievement(
          userId,
          AchievementType.EARLY_BIRD,
        );
        newlyUnlocked.push(achievement);
        unlockedTypes.add(AchievementType.EARLY_BIRD);
      }
    }

    // Night owl (atividade após as 22h)
    if (!unlockedTypes.has(AchievementType.NIGHT_OWL)) {
      const hasNightActivity = completedActivities.some((a) => {
        const hour = new Date(a.startTime).getHours();
        return hour >= 22;
      });
      if (hasNightActivity) {
        const achievement = await this.unlockAchievement(
          userId,
          AchievementType.NIGHT_OWL,
        );
        newlyUnlocked.push(achievement);
        unlockedTypes.add(AchievementType.NIGHT_OWL);
      }
    }

    // Multi-sport (3 esportes diferentes)
    if (!unlockedTypes.has(AchievementType.MULTI_SPORT)) {
      const distinctSports = new Set(
        completedActivities.map((a) => a.sport),
      );
      if (distinctSports.size >= 3) {
        const achievement = await this.unlockAchievement(
          userId,
          AchievementType.MULTI_SPORT,
        );
        newlyUnlocked.push(achievement);
        unlockedTypes.add(AchievementType.MULTI_SPORT);
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

  private calculateCurrentStreak(activities: Activity[]): number {
    if (activities.length === 0) return 0;

    // Agrupar atividades por data (dia)
    const activityDates = new Set<string>();
    for (const activity of activities) {
      const date = new Date(activity.startTime);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      activityDates.add(dateStr);
    }

    // Ordenar as datas
    const sortedDates = Array.from(activityDates).sort().reverse();
    if (sortedDates.length === 0) return 0;

    // Verificar se o streak inclui hoje ou ontem
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
      return 0;
    }

    // Contar dias consecutivos
    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      const diffMs = current.getTime() - next.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
