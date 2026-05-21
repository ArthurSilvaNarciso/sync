import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Like } from './entities/like.entity';
import { Match } from './entities/match.entity';
import { SwipeDto } from './dto/swipe.dto';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { haversineKm } from '../common/utils/haversine';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  // Algoritmo de discovery - busca usuarios proximos e compativeis
  async discover(userId: string, query: DiscoveryQueryDto) {
    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!currentUser || !currentUser.latitude || !currentUser.longitude) {
      throw new NotFoundException(
        'Complete seu perfil com localizacao primeiro',
      );
    }

    // IDs de usuarios que o user ja interagiu (like ou ignore)
    const alreadySwiped = await this.likeRepository.find({
      where: { from_user_id: userId },
      select: ['to_user_id'],
    });
    const swipedIds = new Set(alreadySwiped.map((l) => l.to_user_id));
    swipedIds.add(userId);

    const radiusKm = query.radiusKm || 10;
    const { page = 1, limit = 20 } = query;

    // Buscar todos usuarios ativos com onboarding completo e localizacao
    let qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .andWhere('user.onboardingCompleted = :completed', { completed: true })
      .andWhere('user.latitude IS NOT NULL');

    if (query.sport) {
      qb = qb.andWhere('user.sports LIKE :sport', {
        sport: `%${query.sport}%`,
      });
    }
    if (query.level) {
      qb = qb.andWhere('user.level = :level', { level: query.level });
    }

    const allUsers = await qb.getMany();

    // Filtrar por distancia e excluir ja vistos (Haversine em JS)
    const results = allUsers
      .filter((u) => !swipedIds.has(u.id))
      .map((u) => ({
        ...u,
        distance: haversineKm(
          currentUser.latitude,
          currentUser.longitude,
          u.latitude,
          u.longitude,
        ),
      }))
      .filter((u) => u.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // Paginacao
    const start = (page - 1) * limit;
    return results.slice(start, start + limit).map((u) => ({
      ...u,
      distance: Math.round(u.distance * 10) / 10,
    }));
  }

  // Processar swipe - cria like e verifica match mutuo
  async swipe(userId: string, dto: SwipeDto) {
    if (!dto.isLike) {
      await this.likeRepository.save({
        from_user_id: userId,
        to_user_id: dto.targetUserId,
        isSuperLike: false,
      });
      return { matched: false };
    }

    await this.likeRepository.save({
      from_user_id: userId,
      to_user_id: dto.targetUserId,
      isSuperLike: dto.isSuperLike || false,
    });

    // Verificar se existe like mutuo (match!)
    const mutualLike = await this.likeRepository.findOne({
      where: {
        from_user_id: dto.targetUserId,
        to_user_id: userId,
      },
    });

    if (mutualLike) {
      try {
        // Check if match already exists (race condition prevention)
        const existingMatch = await this.matchRepository.findOne({
          where: [
            { user1_id: userId, user2_id: dto.targetUserId },
            { user1_id: dto.targetUserId, user2_id: userId },
          ],
        });
        if (existingMatch) {
          return { matched: true, matchId: existingMatch.id };
        }
        const match = await this.matchRepository.save({
          user1_id: userId,
          user2_id: dto.targetUserId,
        });
        return { matched: true, matchId: match.id };
      } catch {
        return { matched: false };
      }
    }

    return { matched: false };
  }

  async getNewMatchCount(userId: string): Promise<number> {
    const count = await this.matchRepository
      .createQueryBuilder('match')
      .where('match.user1_id = :userId OR match.user2_id = :userId', { userId })
      .andWhere('match.createdAt > :since', { since: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getCount();
    return count;
  }

  // Listar todos os matches do usuario
  async getMatches(userId: string) {
    const matches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.user1', 'user1')
      .leftJoinAndSelect('match.user2', 'user2')
      .where('match.user1_id = :userId OR match.user2_id = :userId', {
        userId,
      })
      .orderBy('match.createdAt', 'DESC')
      .getMany();

    return matches.map((match) => ({
      matchId: match.id,
      user: match.user1_id === userId ? match.user2 : match.user1,
      createdAt: match.createdAt,
    }));
  }
}
