import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private readonly repo: Repository<Challenge>,
  ) {}

  async create(challengerId: string, body: {
    challengedId: string;
    sport: string;
    metric: string;
    target: number;
    expiresInDays?: number;
  }): Promise<Challenge> {
    if (challengerId === body.challengedId) {
      throw new ForbiddenException('Você não pode se desafiar');
    }
    const expiresAt = new Date(Date.now() + (body.expiresInDays || 7) * 86_400_000);
    return this.repo.save(this.repo.create({
      challenger_id: challengerId,
      challenged_id: body.challengedId,
      sport: body.sport,
      metric: body.metric,
      target: body.target,
      expiresAt,
    }));
  }

  async list(userId: string): Promise<Challenge[]> {
    return this.repo.find({
      where: [
        { challenger_id: userId },
        { challenged_id: userId },
      ],
      relations: ['challenger', 'challenged'],
      order: { createdAt: 'DESC' },
    });
  }

  async respond(userId: string, id: string, accept: boolean): Promise<Challenge> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Desafio não encontrado');
    if (c.challenged_id !== userId) throw new ForbiddenException('Acesso negado');
    if (c.status !== 'pending') throw new ForbiddenException('Desafio já respondido');
    c.status = accept ? 'accepted' : 'declined';
    return this.repo.save(c);
  }

  async complete(userId: string, id: string): Promise<Challenge> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Desafio não encontrado');
    if (c.challenger_id !== userId && c.challenged_id !== userId) {
      throw new ForbiddenException('Acesso negado');
    }
    if (c.status !== 'accepted') throw new ForbiddenException('Desafio não está ativo');
    c.status = 'completed';
    c.winner_id = userId;
    return this.repo.save(c);
  }
}
