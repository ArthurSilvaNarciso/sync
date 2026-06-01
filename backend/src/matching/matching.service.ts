import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Like } from './entities/like.entity';
import { Match } from './entities/match.entity';
import { Activity } from '../activities/entities/activity.entity';
import { SwipeDto } from './dto/swipe.dto';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { haversineKm } from '../common/utils/haversine';
import { PushService } from '../notifications/push.service';

// Projeta apenas campos públicos-seguros de um usuário descoberto/matched.
// NÃO inclui email, latitude exata, longitude exata.
function safeDiscoverUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    bannerUrl: u.bannerUrl,
    profilePhotos: u.profilePhotos,
    bio: u.bio,
    city: u.city,     // cidade sem coordenadas precisas
    sports: u.sports,
    level: u.level,
    objectives: u.objectives,
    availability: u.availability,
    subscriptionTier: u.subscriptionTier,
    totalXP: u.totalXP,
    createdAt: u.createdAt,
  };
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly pushService: PushService,
  ) {}

  /**
   * Pace médio de múltiplos usuários nos últimos 30 dias — uma query em batch
   * em vez de N queries individuais.
   */
  private async getBatchAvgPace(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.activityRepository
      .createQueryBuilder('a')
      .select('a.user_id', 'userId')
      .addSelect('AVG(a.avgPace)', 'avgPace')
      .where('a.user_id IN (:...userIds)', { userIds })
      .andWhere('a.isCompleted = :completed', { completed: true })
      .andWhere('a.avgPace > 0')
      .andWhere('a.startTime > :since', { since: thirtyDaysAgo })
      .groupBy('a.user_id')
      .getRawMany<{ userId: string; avgPace: string | number | null }>();

    const map = new Map<string, number>();
    for (const row of rows) {
      const pace = typeof row.avgPace === 'string' ? parseFloat(row.avgPace) : row.avgPace;
      if (pace && pace > 0) map.set(row.userId, pace);
    }
    return map;
  }

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

    // Filtra availability (interseção de arrays)
    let filtered = allUsers.filter((u) => !swipedIds.has(u.id));
    if (query.availability) {
      filtered = filtered.filter((u) => u.availability?.includes(query.availability!));
    }

    // Computa distância para pré-filtrar antes de buscar pace (reduz o batch)
    const withDistance = filtered
      .map((u) => ({
        ...u,
        distance: haversineKm(
          (currentUser.latitude ?? 0) as number,
          (currentUser.longitude ?? 0) as number,
          (u.latitude ?? 0) as number,
          (u.longitude ?? 0) as number,
        ),
      }))
      .filter((u) => u.distance <= radiusKm);

    // Batch pace query — uma única query para todos os candidatos no raio
    const candidateIds = withDistance.map((u) => u.id);
    const [paceMap, myPaceRaw] = await Promise.all([
      this.getBatchAvgPace(candidateIds),
      this.getBatchAvgPace([userId]),
    ]);
    const myPace = myPaceRaw.get(userId) ?? 0;

    const usersWithMeta = withDistance.map((u) => ({
      ...u,
      avgPace: paceMap.get(u.id) ?? null,
    }));

    // Filtra por pace
    const results = usersWithMeta
      .filter((u) => {
        if (query.paceMin && u.avgPace && u.avgPace < query.paceMin) return false;
        if (query.paceMax && u.avgPace && u.avgPace > query.paceMax) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort por compatibilidade: distância + diff de pace (usa pace real do usuário)
        const paceDiffA = a.avgPace && myPace ? Math.abs(a.avgPace - myPace) : 99;
        const paceDiffB = b.avgPace && myPace ? Math.abs(b.avgPace - myPace) : 99;
        return a.distance + paceDiffA / 10 - (b.distance + paceDiffB / 10);
      });

    // Paginacao
    const start = (page - 1) * limit;
    return results.slice(start, start + limit).map((u) => ({
      ...safeDiscoverUser(u),      // sem email / lat exata / long exata
      distance: Math.round(u.distance * 10) / 10,
      avgPace: u.avgPace ? Math.round(u.avgPace * 100) / 100 : null,
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
        // Notifica AMBOS os usuários do novo match (fire-and-forget)
        this.notifyMatch(userId, dto.targetUserId, match.id).catch(() => {});
        return { matched: true, matchId: match.id };
      } catch {
        return { matched: false };
      }
    }

    return { matched: false };
  }

  /** Push de novo match para ambos os usuários, com o nome um do outro */
  private async notifyMatch(userA: string, userB: string, matchId: string) {
    const [a, b] = await Promise.all([
      this.userRepository.findOne({ where: { id: userA }, select: ['id', 'name'] }),
      this.userRepository.findOne({ where: { id: userB }, select: ['id', 'name'] }),
    ]);
    const firstName = (n?: string) => (n || 'alguém').split(' ')[0];
    await Promise.all([
      this.pushService.sendToUser(
        userA,
        'Novo match! 🎉',
        `Você e ${firstName(b?.name)} deram match. Manda um oi!`,
        { type: 'match', matchId },
      ),
      this.pushService.sendToUser(
        userB,
        'Novo match! 🎉',
        `Você e ${firstName(a?.name)} deram match. Manda um oi!`,
        { type: 'match', matchId },
      ),
    ]);
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
      user: safeDiscoverUser(match.user1_id === userId ? match.user2 : match.user1),
      createdAt: match.createdAt,
    }));
  }

  /**
   * Lista usuários que deram like em mim e eu ainda não respondi.
   * Permite a tela "Quem te curtiu" (feature de retenção forte).
   */
  async getLikesReceived(userId: string) {
    // Likes recebidos
    const received = await this.likeRepository
      .createQueryBuilder('like')
      .leftJoinAndSelect('like.fromUser', 'fromUser')
      .where('like.to_user_id = :userId', { userId })
      .orderBy('like.createdAt', 'DESC')
      .limit(100)
      .getMany();
    if (received.length === 0) return [];

    // Likes que EU já dei (pra filtrar fora os que já são match)
    const myActions = await this.likeRepository.find({
      where: { from_user_id: userId },
      select: ['to_user_id'],
    });
    const respondedSet = new Set(myActions.map((l) => l.to_user_id));

    return received
      .filter((l) => !respondedSet.has(l.from_user_id))
      .map((l) => ({
        likeId: l.id,
        createdAt: l.createdAt,
        isSuperLike: l.isSuperLike,
        user: l.fromUser
          ? {
              id: l.fromUser.id,
              name: l.fromUser.name,
              avatarUrl: l.fromUser.avatarUrl,
              level: (l.fromUser as any).level,
              sports: (l.fromUser as any).sports,
              bio: l.fromUser.bio,
            }
          : null,
      }))
      .filter((x) => x.user != null);
  }

  async getLikesReceivedCount(userId: string): Promise<number> {
    const list = await this.getLikesReceived(userId);
    return list.length;
  }
}
