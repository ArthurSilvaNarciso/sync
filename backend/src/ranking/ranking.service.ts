import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { User } from '../users/entities/user.entity';
import { Match } from '../matching/entities/match.entity';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class RankingService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  private getCacheKey(prefix: string, ...parts: (string | number | undefined)[]): string {
    return `${prefix}:${parts.map((p) => p ?? 'all').join(':')}`;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }

  // Ranking mensal por distância total — filtrado por cidade + esporte
  async getMonthlyRanking(city?: string, month?: number, year?: number, sport?: string) {
    const cacheKey = this.getCacheKey('monthly', city, month, year, sport);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    let qb = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.name', 'name')
      .addSelect('user.avatarUrl', 'avatarUrl')
      .addSelect('user.city', 'city')
      .addSelect('SUM(activity.distance)', 'totalDistance')
      .addSelect('COUNT(activity.id)', 'totalActivities')
      .where('activity.isCompleted = :completed', { completed: true })
      .andWhere('activity.startTime >= :start', { start: startDate.toISOString() })
      .andWhere('activity.startTime <= :end', { end: endDate.toISOString() })
      .groupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.avatarUrl')
      .addGroupBy('user.city')
      .orderBy('"totalDistance"', 'DESC');

    if (city) qb = qb.andWhere('user.city = :city', { city });
    if (sport) qb = qb.andWhere('activity.sport = :sport', { sport });

    const results = await qb.limit(100).getRawMany();
    const mapped = this.mapResults(results);
    this.setCache(cacheKey, mapped);
    return mapped;
  }

  // Ranking semanal — semana corrente (segunda → domingo)
  async getWeeklyRanking(city?: string, sport?: string) {
    const cacheKey = this.getCacheKey('weekly', city, sport);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const day = now.getDay();              // 0=dom, 1=seg, ...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    let qb = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.name', 'name')
      .addSelect('user.avatarUrl', 'avatarUrl')
      .addSelect('user.city', 'city')
      .addSelect('SUM(activity.distance)', 'totalDistance')
      .addSelect('COUNT(activity.id)', 'totalActivities')
      .where('activity.isCompleted = :completed', { completed: true })
      .andWhere('activity.startTime >= :start', { start: startOfWeek.toISOString() })
      .andWhere('activity.startTime < :end', { end: endOfWeek.toISOString() })
      .groupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.avatarUrl')
      .addGroupBy('user.city')
      .orderBy('"totalDistance"', 'DESC');

    if (city) qb = qb.andWhere('user.city = :city', { city });
    if (sport) qb = qb.andWhere('activity.sport = :sport', { sport });

    const results = await qb.limit(50).getRawMany();
    const mapped = this.mapResults(results);
    this.setCache(cacheKey, mapped);
    return mapped;
  }

  // Ranking entre amigos (matches do user)
  async getFriendsRanking(userId: string, scope: 'week' | 'month' = 'month') {
    const cacheKey = this.getCacheKey('friends', userId, scope);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Pega todos os matches do user
    const matches = await this.matchRepository
      .createQueryBuilder('match')
      .where('match.user1_id = :userId OR match.user2_id = :userId', { userId })
      .getMany();

    const friendIds = matches.map((m) =>
      m.user1_id === userId ? m.user2_id : m.user1_id,
    );
    friendIds.push(userId);              // inclui o próprio user pra comparação

    if (friendIds.length === 0) return [];

    const now = new Date();
    let startDate: Date;
    if (scope === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now); startDate.setDate(diff); startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const results = await this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.name', 'name')
      .addSelect('user.avatarUrl', 'avatarUrl')
      .addSelect('SUM(activity.distance)', 'totalDistance')
      .addSelect('COUNT(activity.id)', 'totalActivities')
      .where('activity.isCompleted = :completed', { completed: true })
      .andWhere('activity.user_id IN (:...ids)', { ids: friendIds })
      .andWhere('activity.startTime >= :start', { start: startDate.toISOString() })
      .groupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.avatarUrl')
      .orderBy('"totalDistance"', 'DESC')
      .getRawMany();

    const mapped = this.mapResults(results);
    this.setCache(cacheKey, mapped);
    return mapped;
  }

  private mapResults(results: any[]) {
    return results.map((r, index) => ({
      position: index + 1,
      userId: r.userId,
      name: r.name,
      avatarUrl: r.avatarUrl,
      city: r.city,
      totalDistance: Math.round(parseFloat(r.totalDistance || '0')),
      totalDistanceKm:
        Math.round((parseFloat(r.totalDistance || '0') / 1000) * 100) / 100,
      totalActivities: parseInt(r.totalActivities, 10),
    }));
  }
}
