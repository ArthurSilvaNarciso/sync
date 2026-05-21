import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { User } from '../users/entities/user.entity';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class RankingService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private getCacheKey(city?: string, month?: number, year?: number): string {
    return `ranking:${city || 'all'}:${month || 0}:${year || 0}`;
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

  // Ranking mensal por distância total - filtrado por cidade/região
  async getMonthlyRanking(city?: string, month?: number, year?: number) {
    const cacheKey = this.getCacheKey(city, month, year);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Início e fim do mês
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

    if (city) {
      qb = qb.andWhere('user.city = :city', { city });
    }

    const results = await qb.limit(100).getRawMany();

    const mapped = results.map((r, index) => ({
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

    this.setCache(cacheKey, mapped);
    return mapped;
  }
}
