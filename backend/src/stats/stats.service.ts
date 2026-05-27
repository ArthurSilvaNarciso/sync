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

  // Retorna estatísticas completas do usuário usando agregações no banco
  // (evita carregar todas as atividades na memória para usuários com muitas atividades)
  async getUserStats(userId: string) {
    // --- Agregados totais via uma query só ---
    const totalsRow = await this.activityRepository
      .createQueryBuilder('a')
      .select('COUNT(a.id)', 'totalActivities')
      .addSelect('COALESCE(SUM(a.distance), 0)', 'totalDistanceM')
      .addSelect('COALESCE(SUM(a.duration), 0)', 'totalDurationSec')
      .addSelect('COALESCE(AVG(a.avgPace), 0)', 'averagePace')
      .addSelect('COALESCE(AVG(a.avgSpeed), 0)', 'averageSpeed')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.isCompleted = :c', { c: true })
      .getRawOne<{
        totalActivities: string;
        totalDistanceM: string;
        totalDurationSec: string;
        averagePace: string;
        averageSpeed: string;
      }>();

    const totalActivities = parseInt(totalsRow?.totalActivities ?? '0', 10);
    const totalDistanceM = parseFloat(totalsRow?.totalDistanceM ?? '0');
    const totalDurationSec = parseFloat(totalsRow?.totalDurationSec ?? '0');
    const totalDistance = Math.round((totalDistanceM / 1000) * 100) / 100; // km
    const totalDuration = Math.round((totalDurationSec / 3600) * 100) / 100; // horas
    const totalCalories = Math.round(totalDistance * 60);
    const averagePace = Math.round(parseFloat(totalsRow?.averagePace ?? '0') * 100) / 100;
    const averageSpeed = Math.round(parseFloat(totalsRow?.averageSpeed ?? '0') * 100) / 100;

    // --- Atividade mais longa (apenas 1 linha) ---
    const longestRow = await this.activityRepository.findOne({
      where: { user_id: userId, isCompleted: true },
      order: { distance: 'DESC' },
      select: ['id', 'sport', 'distance', 'duration', 'startTime'],
    });
    const longestActivity = longestRow
      ? {
          id: longestRow.id,
          sport: longestRow.sport,
          distance: Math.round((longestRow.distance / 1000) * 100) / 100,
          duration: longestRow.duration,
          date: longestRow.startTime,
        }
      : null;

    // --- Streaks: busca apenas datas distintas dos últimos ~400 dias (<=400 linhas) ---
    const { currentStreak, bestStreak } = await this.computeStreaks(userId);

    // --- Contagens em paralelo ---
    const [totalMatches, totalEvents, totalMessagesSent] = await Promise.all([
      this.matchRepository
        .createQueryBuilder('match')
        .where('match.user1_id = :userId OR match.user2_id = :userId', { userId })
        .getCount(),
      this.eventRepository.count({ where: { creator_id: userId } }),
      this.messageRepository.count({ where: { sender_id: userId } }),
    ]);

    // --- Sport breakdown via GROUP BY ---
    const sportRows = await this.activityRepository
      .createQueryBuilder('a')
      .select('a.sport', 'sport')
      .addSelect('COUNT(a.id)', 'count')
      .addSelect('COALESCE(SUM(a.distance), 0)', 'totalDistance')
      .addSelect('COALESCE(SUM(a.duration), 0)', 'totalDuration')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.isCompleted = :c', { c: true })
      .groupBy('a.sport')
      .getRawMany<{ sport: string; count: string; totalDistance: string; totalDuration: string }>();

    const sportBreakdown = sportRows.map((r) => ({
      sport: r.sport,
      count: parseInt(r.count, 10),
      totalDistance: Math.round((parseFloat(r.totalDistance) / 1000) * 100) / 100,
      totalDuration: Math.round((parseFloat(r.totalDuration) / 3600) * 100) / 100,
    }));

    // --- Últimos 7 dias ---
    const weeklyStats = await this.computeWeeklyStats(userId);

    // --- Últimos 12 meses ---
    const monthlyStats = await this.computeMonthlyStats(userId);

    return {
      totalActivities,
      totalDistance,
      totalDuration,
      totalCalories,
      averagePace,
      averageSpeed,
      longestActivity,
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

  // Resumo semanal (delegado para computeWeeklyStats)
  async getWeeklySummary(userId: string) {
    return this.computeWeeklyStats(userId);
  }

  // --- Agregação de streaks via datas distintas (max ~400 linhas) ---
  private async computeStreaks(userId: string): Promise<{ currentStreak: number; bestStreak: number }> {
    // Busca datas distintas de atividades nos últimos 2 anos (limita o volume)
    const rows = await this.activityRepository
      .createQueryBuilder('a')
      .select('DATE(a.startTime)', 'activityDate')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.isCompleted = :c', { c: true })
      .andWhere('a.startTime > :since', { since: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000) })
      .groupBy('DATE(a.startTime)')
      .orderBy('activityDate', 'ASC')
      .getRawMany<{ activityDate: string }>();

    if (rows.length === 0) return { currentStreak: 0, bestStreak: 0 };

    const sortedDates = rows.map((r) => r.activityDate);

    // Best streak
    let bestStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 1;
      }
    }

    // Current streak
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const reversedDates = [...sortedDates].reverse();
    let currentStreak = 0;
    if (reversedDates[0] === todayStr || reversedDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 0; i < reversedDates.length - 1; i++) {
        const curr = new Date(reversedDates[i]);
        const next = new Date(reversedDates[i + 1]);
        const diffDays = Math.round((curr.getTime() - next.getTime()) / 86400000);
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return { currentStreak, bestStreak };
  }

  // --- Últimos 7 dias via GROUP BY ---
  private async computeWeeklyStats(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const rows = await this.activityRepository
      .createQueryBuilder('a')
      .select('DATE(a.startTime)', 'activityDate')
      .addSelect('COALESCE(SUM(a.distance), 0)', 'totalDistance')
      .addSelect('COALESCE(SUM(a.duration), 0)', 'totalDuration')
      .addSelect('COUNT(a.id)', 'count')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.isCompleted = :c', { c: true })
      .andWhere('a.startTime >= :since', { since: since.toISOString() })
      .groupBy('DATE(a.startTime)')
      .getRawMany<{ activityDate: string; totalDistance: string; totalDuration: string; count: string }>();

    const rowMap = new Map(rows.map((r) => [r.activityDate, r]));
    const stats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const row = rowMap.get(dateStr);
      stats.push({
        date: dateStr,
        distance: row ? Math.round((parseFloat(row.totalDistance) / 1000) * 100) / 100 : 0,
        duration: row ? Math.round((parseFloat(row.totalDuration) / 3600) * 100) / 100 : 0,
        count: row ? parseInt(row.count, 10) : 0,
      });
    }
    return stats;
  }

  // --- Últimos 12 meses via GROUP BY ---
  private async computeMonthlyStats(userId: string) {
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await this.activityRepository
      .createQueryBuilder('a')
      .select("strftime('%Y-%m', a.startTime)", 'yearMonth')
      .addSelect('COALESCE(SUM(a.distance), 0)', 'totalDistance')
      .addSelect('COALESCE(SUM(a.duration), 0)', 'totalDuration')
      .addSelect('COUNT(a.id)', 'count')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.isCompleted = :c', { c: true })
      .andWhere('a.startTime >= :since', { since: since.toISOString() })
      .groupBy("strftime('%Y-%m', a.startTime)")
      .getRawMany<{ yearMonth: string; totalDistance: string; totalDuration: string; count: string }>();

    const rowMap = new Map(rows.map((r) => [r.yearMonth, r]));
    const stats = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const row = rowMap.get(monthStr);
      stats.push({
        month: monthStr,
        distance: row ? Math.round((parseFloat(row.totalDistance) / 1000) * 100) / 100 : 0,
        duration: row ? Math.round((parseFloat(row.totalDuration) / 3600) * 100) / 100 : 0,
        count: row ? parseInt(row.count, 10) : 0,
      });
    }
    return stats;
  }
}
