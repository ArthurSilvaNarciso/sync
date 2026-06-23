import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like as ILike, LessThan } from 'typeorm';
import { Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserBlock } from './entities/user-block.entity';
import { BannedCpf } from './entities/banned-cpf.entity';
import { UserReport } from './entities/user-report.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ReportReason } from './entities/user-report.entity';
import { sanitizeText } from '../common/security/sanitize.util';

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
   * Perfil público seguro: remove email, lat/long precisos e outros dados sensíveis.
   * Usar para GET /users/:id (perfil de outro usuário).
   */
  async publicProfile(id: string) {
    const user = await this.findById(id);
    return {
      id: user.id,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      profilePhotos: user.profilePhotos,
      prompts: user.prompts,
      sports: user.sports,
      level: user.level,
      objectives: user.objectives,
      availability: user.availability,
      city: user.city,           // apenas cidade — sem coordenadas precisas
      isActive: user.isActive,
      subscriptionTier: user.subscriptionTier,
      totalXP: user.totalXP,
      createdAt: user.createdAt,
    };
  }

  /**
   * LGPD/GDPR: anonimiza usuário (não deleta para preservar integridade
   * referencial de atividades em grupos/eventos públicos).
   */
  /**
   * Exclusão de conta LGPD — soft-delete real:
   * 1. Anonimiza TODO o PII imediatamente (privacy-first)
   * 2. Marca deletedAt (@DeleteDateColumn) → TypeORM exclui de find/findOne
   *    automaticamente, então o usuário some do app e não consegue mais logar
   * 3. O purge definitivo (hard-delete da linha) roda por cron após 30 dias
   *    — ver purgeDeletedAccounts()
   */
  async anonymizeUser(userId: string): Promise<{ ok: true; message: string }> {
    const fake = `deleted-${userId.slice(0, 8)}-${Date.now()}`;
    await this.userRepository.update(userId, {
      name: 'Usuário Removido',
      email: `${fake}@deleted.sync`,
      bio: null,
      avatarUrl: null,
      bannerUrl: null,
      profilePhotos: null,
      birthDate: null,
      sports: null,
      objectives: null,
      availability: null,
      latitude: null,
      longitude: null,
      city: null,
      weightKg: null,
      heightCm: null,
      gender: null,
      isActive: false,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      deletedAt: new Date(), // soft-delete: some de todas as queries
    } as any);
    return {
      ok: true,
      message:
        'Conta excluída e anonimizada conforme LGPD. Dados serão apagados definitivamente em 30 dias.',
    };
  }

  /**
   * Purga definitiva: hard-delete de contas soft-deletadas há mais de 30 dias.
   * Chamado por cron diário. Retorna quantas foram removidas.
   */
  async purgeDeletedAccounts(graceDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - graceDays * 86_400_000);
    // withDeleted: precisa ver os soft-deletados para purgá-los de vez
    const stale = await this.userRepository.find({
      where: { deletedAt: LessThan(cutoff) },
      withDeleted: true,
      select: ['id'],
    });
    if (stale.length === 0) return 0;
    const ids = stale.map((u) => u.id);
    // delete() físico (hard) — remove a linha definitivamente
    await this.userRepository.delete(ids);
    new Logger('UsersService').log(`Purga LGPD: ${ids.length} conta(s) removida(s) definitivamente`);
    return ids.length;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const sanitized: any = {
      ...dto,
      ...(dto.name !== undefined && { name: sanitizeText(dto.name, 100) }),
      ...(dto.bio !== undefined && { bio: sanitizeText(dto.bio, 500) || undefined }),
      ...(dto.city !== undefined && { city: sanitizeText(dto.city, 100) || undefined }),
    };
    // Frases estilo Tinder: máx 5, pergunta ≤ 60, resposta ≤ 150, sanitizadas.
    if (dto.prompts !== undefined) {
      sanitized.prompts = Array.isArray(dto.prompts)
        ? dto.prompts
            .filter((p) => p && typeof p.q === 'string' && typeof p.a === 'string' && p.a.trim().length > 0)
            .slice(0, 5)
            .map((p) => ({ q: sanitizeText(p.q, 60), a: sanitizeText(p.a, 150) }))
        : null;
    }
    await this.userRepository.update(userId, sanitized);
    return this.findById(userId);
  }

  // Completar onboarding - marca que o usuário finalizou o fluxo inicial
  async completeOnboarding(
    userId: string,
    data: UpdateProfileDto,
  ): Promise<User> {
    const sanitized: UpdateProfileDto = {
      ...data,
      ...(data.name !== undefined && { name: sanitizeText(data.name, 100) }),
      ...(data.bio !== undefined && { bio: sanitizeText(data.bio, 500) || undefined }),
      ...(data.city !== undefined && { city: sanitizeText(data.city, 100) || undefined }),
    };
    await this.userRepository.update(userId, {
      ...sanitized,
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

  async updateBanner(userId: string, bannerUrl: string): Promise<User> {
    await this.userRepository.update(userId, { bannerUrl });
    return this.findById(userId);
  }

  // Verificação de perfil por selfie.
  // MVP: ao enviar uma selfie válida, marca o perfil como verificado.
  // Para verificação real (anti-catfish), aqui entraria um serviço de
  // liveness + face-match comparando a selfie com as fotos do perfil
  // (ex.: AWS Rekognition CompareFaces). Mantido simples para a demo.
  async verifyWithSelfie(userId: string): Promise<User> {
    await this.userRepository.update(userId, { isVerified: true });
    return this.findById(userId);
  }

  // Salvar fotos do perfil (array de data URLs base64 ou URLs, máx 5)
  async updateProfilePhotos(userId: string, photos: string[]): Promise<User> {
    if (!Array.isArray(photos) || photos.length < 1) {
      throw new Error('Envie pelo menos 1 foto.');
    }
    const limited = photos.slice(0, 5);
    // Se o usuário ainda não tem avatar, usa a 1ª foto como avatar — assim a
    // foto do onboarding aparece no perfil, no discovery e no chat.
    const current = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'avatarUrl'] });
    const patch: Partial<User> = { profilePhotos: limited };
    if (!current?.avatarUrl) {
      patch.avatarUrl = limited[0];
    }
    await this.userRepository.update(userId, patch);
    return this.findById(userId);
  }

  // Buscar usuários por nome
  async searchUsers(
    query: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Cap para prevenir varredura de banco via parâmetros manipulados
    const safePage = Math.max(1, Math.min(page, 100));
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const skip = (safePage - 1) * safeLimit;
    // Sanitiza o termo de busca antes de usar em LIKE
    const safeQuery = sanitizeText(query, 100).replace(/[%_\\]/g, '\\$&');
    if (!safeQuery) return { users: [], total: 0, page: safePage, limit: safeLimit, totalPages: 0 };

    const [users, total] = await this.userRepository
      .createQueryBuilder('user')
      .where('user.name LIKE :query', { query: `%${safeQuery}%` })
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
      .take(safeLimit)
      .getManyAndCount();

    return {
      users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
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

    // Sanitiza descrição antes de persistir (evita XSS no painel admin)
    const safeDescription = description ? sanitizeText(description, 500) : undefined;

    await this.userReportRepository.save({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason,
      description: safeDescription,
    });

    // Auto-moderação: se o usuário acumulou denúncias de >= 3 pessoas
    // DIFERENTES, desativa a conta automaticamente (fica fora do Descobrir,
    // não loga). Admin pode reverter depois.
    const AUTO_BAN_THRESHOLD = 3;
    const reports = await this.userReportRepository.find({
      where: { reported_id: reportedId },
      select: ['reporter_id'],
    });
    const distinctReporters = new Set(reports.map((r) => r.reporter_id));
    if (distinctReporters.size >= AUTO_BAN_THRESHOLD) {
      await this.userRepository.update(reportedId, { isActive: false });
      await this.addCpfToBanList(reportedId, 'auto-ban: denúncias');
    }
  }

  // Adiciona o hash do CPF do usuário (se houver) à lista de banidos, pra
  // impedir que a pessoa crie outra conta com o mesmo CPF.
  private async addCpfToBanList(userId: string, reason: string): Promise<void> {
    const u = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'cpfHash'],
    });
    if (!u?.cpfHash) return;
    await this.userRepository.manager
      .createQueryBuilder()
      .insert()
      .into(BannedCpf)
      .values({ cpfHash: u.cpfHash, reason })
      .orIgnore() // não falha se já estiver na lista
      .execute();
  }
}
