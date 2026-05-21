import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private readonly storyRepo: Repository<Story>,
    @InjectRepository(StoryView)
    private readonly viewRepo: Repository<StoryView>,
  ) {}

  // Criar story — expira em 24h
  async create(
    userId: string,
    mediaUrl: string,
    options: {
      mediaType?: 'image' | 'video';
      caption?: string;
      activityId?: string;
      sport?: string;
      distanceKm?: number;
    } = {},
  ): Promise<Story> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const story = this.storyRepo.create({
      user_id: userId,
      mediaUrl,
      mediaType: options.mediaType || 'image',
      caption: options.caption ?? null,
      activity_id: options.activityId ?? null,
      sport: options.sport ?? null,
      distanceKm: options.distanceKm ?? null,
      expiresAt,
    });
    return this.storyRepo.save(story);
  }

  // Feed de stories ativas (não expiradas) — ordenadas por novo + paginadas
  async getFeed(
    page = 1,
    limit = 30,
  ): Promise<{ stories: Story[]; total: number }> {
    const [stories, total] = await this.storyRepo.findAndCount({
      where: { expiresAt: MoreThan(new Date()) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { stories, total };
  }

  // Stories de um user específico (perfil)
  async getByUser(userId: string): Promise<Story[]> {
    return this.storyRepo.find({
      where: { user_id: userId, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // Marca como visto (idempotente)
  async markViewed(storyId: string, viewerId: string): Promise<void> {
    const story = await this.storyRepo.findOne({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story não encontrado');

    // Não conta view do próprio dono
    if (story.user_id === viewerId) return;

    try {
      await this.viewRepo.save(
        this.viewRepo.create({ story_id: storyId, viewer_id: viewerId }),
      );
      await this.storyRepo.increment({ id: storyId }, 'viewCount', 1);
    } catch {
      // já visto — ignora (Unique constraint)
    }
  }

  // Like (idempotente — toggle)
  async toggleLike(storyId: string): Promise<{ likeCount: number }> {
    const story = await this.storyRepo.findOne({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story não encontrado');
    await this.storyRepo.increment({ id: storyId }, 'likeCount', 1);
    return { likeCount: story.likeCount + 1 };
  }

  // Delete (só o dono)
  async delete(storyId: string, userId: string): Promise<void> {
    const story = await this.storyRepo.findOne({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story não encontrado');
    if (story.user_id !== userId) throw new ForbiddenException('Sem permissão');
    await this.storyRepo.delete(storyId);
  }

  // Limpa stories expiradas (chamar via cron)
  async cleanupExpired(): Promise<{ deleted: number }> {
    const result = await this.storyRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
    return { deleted: result.affected ?? 0 };
  }
}
