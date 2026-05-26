import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityFeedPost } from './activity-feed.entity';
import { FeedComment } from './feed-comment.entity';
import { sanitizeText, sanitizeUrl } from '../common/security/sanitize.util';

@Injectable()
export class ActivityFeedService {
  constructor(
    @InjectRepository(ActivityFeedPost)
    private readonly repo: Repository<ActivityFeedPost>,
    @InjectRepository(FeedComment)
    private readonly commentRepo: Repository<FeedComment>,
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
      caption: sanitizeText(dto.caption, 500) || null,
      photoUrl: sanitizeUrl(dto.photoUrl),
      distanceKm: Math.max(0, Math.min(10000, dto.distanceKm || 0)),
      durationSeconds: Math.max(0, Math.min(86400 * 7, dto.durationSeconds || 0)),
      avgPace: Math.max(0, Math.min(60, dto.avgPace || 0)),
      calories: Math.max(0, Math.min(100000, dto.calories || 0)),
      sport: sanitizeText(dto.sport, 40) || null,
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

  async unlike(postId: string) {
    const post = await this.repo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.likesCount > 0) {
      await this.repo.decrement({ id: postId }, 'likesCount', 1);
    }
    return { likesCount: Math.max(0, post.likesCount - 1) };
  }

  async getComments(postId: string, page = 1, limit = 20) {
    return this.commentRepo.find({
      where: { post_id: postId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async addComment(postId: string, userId: string, text: string) {
    if (!text || text.trim().length === 0) throw new BadRequestException('Comentário não pode ser vazio');
    if (text.length > 500) throw new BadRequestException('Comentário muito longo (máx 500 chars)');
    const post = await this.repo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post não encontrado');
    const comment = this.commentRepo.create({
      post_id: postId,
      user_id: userId,
      text: sanitizeText(text, 500),
    });
    const saved = await this.commentRepo.save(comment);
    await this.repo.increment({ id: postId }, 'commentsCount', 1);
    return this.commentRepo.findOne({ where: { id: saved.id }, relations: ['user'] });
  }

  async deleteComment(postId: string, commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId, post_id: postId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.user_id !== userId) throw new BadRequestException('Você não é dono deste comentário');
    await this.commentRepo.remove(comment);
    await this.repo.decrement({ id: postId }, 'commentsCount', 1);
    return { ok: true };
  }

  async delete(userId: string, postId: string) {
    const post = await this.repo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.user_id !== userId) throw new BadRequestException('Você não é dono deste post');
    await this.repo.remove(post);
    return { ok: true };
  }
}
