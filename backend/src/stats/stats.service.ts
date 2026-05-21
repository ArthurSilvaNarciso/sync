import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { Match } from '../matching/entities/match.entity';
import { Event } from '../events/entities/event.entity';
import { Message } from '../chat/entities/message.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  // Retorna estatísticas completas do usuário
  async getUserStats(userId: string) {
    const completedActivities = await this.activityRepository.find({
      where: { user_id: userId, isCompleted: true },
      order: { startTime: 'ASC' },
    });

    // Totais
    const totalActivities = completedActivities.length;
    const totalDistance =
      Math.round(
        (completedActivities.reduce((sum, a) => sum + (a.distance || 0), 0) /
          1000) *
          100,
      ) / 100; // km
    const totalDurationSeconds = completedActivities.reduce(
      (sum, a) => sum + (a.duration || 0),
      0,
    );
    const totalDuration =
      Math.round((totalDurationSeconds / 3600) * 100) / 100; // horas

    // Estimativa de calorias (aprox. 60 cal/km como média geral)
    const totalCalories = Math.round(totalDistance * 60);

    // Médias
    const averagePace =
      totalActivities > 0
        ? Math.round(
            (completedActivities.reduce(
              (sum, a) => sum + (a.avgPace || 0),
              0,
            ) /
              totalActivities) *
              100,
          ) / 100
        : 0;
    const averageSpeed =
      totalActivities > 0
        ? Math.round(
            (completedActivities.reduce(
              (sum, a) => sum + (a.avgSpeed || 0),
              0,
            ) /
              totalActivities) *
              100,
          ) / 100
        : 0;

    // Atividade mais longa (por distância)
    const longestActivity =
      completedActivities.length > 0
        ? completedActivities.reduce((longest, a) =>
            (a.distance || 0) > (longest.distance || 0) ? a : longest,
          )
        : null;

    // Streaks
    const { currentStreak, bestStreak } =
      this.calculateStreaks(completedActivities);

    // Matches
    const totalMatches = await this.matchRepository
      .createQueryBuilder('match')
      .where('match.user1_id = :userId OR match.user2_id = :userId', {
        userId,
      })
      .getCount();

    // Eventos criados
    const totalEvents = await this.eventRepository.count({
      where: { creator_id: userId },
    });

    // Mensagens enviadas
    const totalMessagesSent = await this.messageRepository.count({
      where: { sender_id: userId },
    });

    // Breakdown por esporte
    const sportBreakdown = this.calculateSportBreakdown(completedActivities);

    // Stats semanais (últimos 7 dias)
    const weeklyStats = this.calculateWeeklyStats(completedActivities);

    // Stats mensais (últimos 12 meses)
    const monthlyStats = this.calculateMonthlyStats(completedActivities);

    return {
      totalActivities,
      totalDistance,
      totalDuration,
      totalCalories,
      averagePace,
      averageSpeed,
      longestActivity: longestActivity
        ? {
            id: longestActivity.id,
            sport: longestActivity.sport,
            distance:
              Math.round((longestActivity.distance / 1000) * 100) / 100,
            duration: longestActivity.duration,
            date: longestActivity.startTime,
          }
        : null,
      currentStreak,
      bestStreak,
      totalMatches,
      totalEvents,
      totalMessagesSent,
      sportBreakdown,
      weeklyStats,
      monthlyStats,
    };
  }

  // Resumo semanal
  async getWeeklySummary(userId: string) {
    const completedActivities = await this.activityRepository.find({
      where: { user_id: userId, isCompleted: true },
      order: { startTime: 'ASC' },
    });

    return this.calculateWeeklyStats(completedActivities);
  }

  private calculateStreaks(activities: Activity[]): {
    currentStreak: number;
    bestStreak: number;
  } {
    if (activities.length === 0) return { currentStreak: 0, bestStreak: 0 };

    // Agrupar por data
    const activityDates = new Set<string>();
    for (const activity of activities) {
      const date = new Date(activity.startTime);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      activityDates.add(dateStr);
    }

    const sortedDates = Array.from(activityDates).sort();
    if (sortedDates.length === 0)
      return { currentStreak: 0, bestStreak: 0 };

    // Calcular melhor streak
    let bestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }

    // Calcular streak atual
    const reversedDates = [...sortedDates].reverse();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let currentStreak = 0;
    if (reversedDates[0] === todayStr || reversedDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 0; i < reversedDates.length - 1; i++) {
        const curr = new Date(reversedDates[i]);
        const next = new Date(reversedDates[i + 1]);
        const diffMs = curr.getTime() - next.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return { currentStreak, bestStreak };
  }

  private calculateSportBreakdown(activities: Activity[]) {
    const sportMap = new Map<
      string,
      { count: number; totalDistance: number; totalDuration: number }
    >();

    for (const activity of activities) {
      const sport = activity.sport;
      const existing = sportMap.get(sport) || {
        count: 0,
        totalDistance: 0,
        totalDuration: 0,
      };
      existing.count++;
      existing.totalDistance += activity.distance || 0;
      existing.totalDuration += activity.duration || 0;
      sportMap.set(sport, existing);
    }

    return Array.from(sportMap.entries()).map(([sport, data]) => ({
      sport,
      count: data.count,
      totalDistance: Math.round((data.totalDistance / 1000) * 100) / 100,
      totalDuration: Math.round((data.totalDuration / 3600) * 100) / 100,
    }));
  }

  private calculateWeeklyStats(activities: Activity[]) {
    const stats: {
      date: string;
      distance: number;
      duration: number;
      count: number;
    }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      const dayActivities = activities.filter((a) => {
        const aDate = new Date(a.startTime);
        const aDateStr = `${aDate.getFullYear()}-${String(aDate.getMonth() + 1).padStart(2, '0')}-${String(aDate.getDate()).padStart(2, '0')}`;
        return aDateStr === dateStr;
      });

      stats.push({
        date: dateStr,
        distance:
          Math.round(
            (dayActivities.reduce((sum, a) => sum + (a.distance || 0), 0) /
              1000) *
              100,
          ) / 100,
        duration:
          Math.round(
            (dayActivities.reduce((sum, a) => sum + (a.duration || 0), 0) /
              3600) *
              100,
          ) / 100,
        count: dayActivities.length,
      });
    }

    return stats;
  }

  private calculateMonthlyStats(activities: Activity[]) {
    const stats: {
      month: string;
      distance: number;
      duration: number;
      count: number;
    }[] = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const monthActivities = activities.filter((a) => {
        const aDate = new Date(a.startTime);
        const aMonthStr = `${aDate.getFullYear()}-${String(aDate.getMonth() + 1).padStart(2, '0')}`;
        return aMonthStr === monthStr;
      });

      stats.push({
        month: monthStr,
        distance:
          Math.round(
            (monthActivities.reduce((sum, a) => sum + (a.distance || 0), 0) /
              1000) *
              100,
          ) / 100,
        duration:
          Math.round(
            (monthActivities.reduce((sum, a) => sum + (a.duration || 0), 0) /
              3600) *
              100,
          ) / 100,
        count: monthActivities.length,
      });
    }

    return stats;
  }
}
