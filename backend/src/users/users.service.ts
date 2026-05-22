import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like as ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { UserBlock } from './entities/user-block.entity';
import { UserReport } from './entities/user-report.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ReportReason } from './entities/user-report.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserBlock)
    private readonly userBlockRepository: Repository<UserBlock>,
    @InjectRepository(UserReport)
    private readonly userReportRepository: Repository<UserReport>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  /**
   * LGPD/GDPR: anonimiza usuário (não deleta para preservar integridade
   * referencial de atividades em grupos/eventos públicos).
   */
  async anonymizeUser(userId: string): Promise<{ ok: true; message: string }> {
    const fake = `deleted-${userId.slice(0, 8)}-${Date.now()}`;
    await this.userRepository.update(userId, {
      name: 'Usuário Removido',
      email: `${fake}@deleted.sync`,
      bio: null,
      avatarUrl: null,
      birthDate: null,
      sports: null,
      objectives: null,
      availability: null,
      latitude: null,
      longitude: null,
      city: null,
      isActive: false,
      twoFactorSecret: null,
      twoFactorEnabled: false,
    } as any);
    return { ok: true, message: 'Conta anonimizada conforme LGPD. Atividades públicas preservadas com nome anônimo.' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    await this.userRepository.update(userId, dto);
    return this.findById(userId);
  }

  // Completar onboarding - marca que o usuário finalizou o fluxo inicial
  async completeOnboarding(
    userId: string,
    data: UpdateProfileDto,
  ): Promise<User> {
    await this.userRepository.update(userId, {
      ...data,
      onboardingCompleted: true,
    });
    return this.findById(userId);
  }

  // Atualizar localização do usuário
  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    city?: string,
  ): Promise<void> {
    await this.userRepository.update(userId, { latitude, longitude, city });
  }

  // Salvar URL do avatar — chamado após upload
  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    await this.userRepository.update(userId, { avatarUrl });
    return this.findById(userId);
  }

  // Buscar usuários por nome
  async searchUsers(
    query: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository
      .createQueryBuilder('user')
      .where('user.name LIKE :query', { query: `%${query}%` })
      .andWhere('user.id != :currentUserId', { currentUserId })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .select([
        'user.id',
        'user.name',
        'user.avatarUrl',
        'user.sports',
        'user.level',
        'user.city',
      ])
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Bloquear usuário
  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Você não pode bloquear a si mesmo');
    }

    await this.findById(blockedId);

    const existing = await this.userBlockRepository.findOne({
      where: { blocker_id: blockerId, blocked_id: blockedId },
    });
    if (existing) {
      throw new BadRequestException('Usuário já está bloqueado');
    }

    await this.userBlockRepository.save({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
  }

  // Desbloquear usuário
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const result = await this.userBlockRepository.delete({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Bloqueio não encontrado');
    }
  }

  // Listar usuários bloqueados
  async getBlockedUsers(userId: string) {
    const blocks = await this.userBlockRepository.find({
      where: { blocker_id: userId },
      relations: ['blocked'],
      order: { createdAt: 'DESC' },
    });

    return blocks.map((block) => ({
      id: block.blocked.id,
      name: block.blocked.name,
      avatarUrl: block.blocked.avatarUrl,
      blockedAt: block.createdAt,
    }));
  }

  // Verificar se algum dos usuários bloqueou o outro
  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await this.userBlockRepository.findOne({
      where: [
        { blocker_id: userId1, blocked_id: userId2 },
        { blocker_id: userId2, blocked_id: userId1 },
      ],
    });
    return !!block;
  }

  // Reportar usuário
  async reportUser(
    reporterId: string,
    reportedId: string,
    reason: ReportReason,
    description?: string,
  ): Promise<void> {
    if (reporterId === reportedId) {
      throw new BadRequestException('Você não pode reportar a si mesmo');
    }

    await this.findById(reportedId);

    await this.userReportRepository.save({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason,
      description,
    });
  }
}
