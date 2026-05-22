import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityFeedPost } from './activity-feed.entity';

@Injectable()
export class ActivityFeedService {
  constructor(
    @InjectRepository(ActivityFeedPost)
    private readonly repo: Repository<ActivityFeedPost>,
  ) {}

  async create(
    userId: string,
    dto: {
      activityId?: string;
      caption?: string;
      photoUrl?: string;
      distanceKm?: number;
      durationSeconds?: number;
      avgPace?: number;
      calories?: number;
      sport?: string;
    },
  ) {
    if ((!dto.caption || dto.caption.trim().length === 0) && !dto.activityId && !dto.photoUrl) {
      throw new BadRequestException('Post precisa ter caption, atividade ou foto');
    }
    const post = this.repo.create({
      user_id: userId,
      activity_id: dto.activityId || null,
      caption: dto.caption?.trim().slice(0, 500) || null,
      photoUrl: dto.photoUrl || null,
      distanceKm: dto.distanceKm || 0,
      durationSeconds: dto.durationSeconds || 0,
      avgPace: dto.avgPace || 0,
      calories: dto.calories || 0,
      sport: dto.sport || null,
    });
    return this.repo.save(post);
  }

  async feed(page = 1, limit = 20) {
    return this.repo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async byUser(userId: string, page = 1, limit = 20) {
    return this.repo.find({
      where: { user_id: userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async like(postId: string) {
    const post = await this.repo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post não encontrado');
    await this.repo.increment({ id: postId }, 'likesCount', 1);
    return { likesCount: post.likesCount + 1 };
  }

  async delete(userId: string, postId: string) {
    const post = await this.repo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.user_id !== userId) throw new BadRequestException('Você não é dono deste post');
    await this.repo.remove(post);
    return { ok: true };
  }
}
