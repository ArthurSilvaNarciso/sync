import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { Request } from 'express';

const REFRESH_DAYS = 7;
const ACCESS_MIN = 15;

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(RefreshToken) private readonly repo: Repository<RefreshToken>,
    private readonly jwt: JwtService,
  ) {}

  /** Cria PAR (access + refresh) em login/register. */
  async issueTokenPair(user: User, req?: Request) {
    const familyId = crypto.randomUUID();
    return this.rotate(user, familyId, req);
  }

  /** Rotaciona refresh: invalida o atual, cria novo na mesma família. */
  async rotate(user: User, familyId: string, req?: Request, currentTokenId?: string) {
    if (currentTokenId) {
      await this.repo.update(currentTokenId, { used: true });
    }
    const rawToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 3600 * 1000);

    const entity = this.repo.create({
      userId: user.id,
      familyId,
      tokenHash,
      expiresAt,
      userAgent: req?.headers['user-agent']?.toString().slice(0, 200) || null,
      ipMasked: this.maskIp(req),
    });
    const saved = await this.repo.save(entity);

    const access = this.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: `${ACCESS_MIN}m` },
    );

    return {
      accessToken: access,
      refreshToken: rawToken,
      refreshExpiresAt: expiresAt,
      _tokenId: saved.id, // interno (não enviar pro cliente)
    };
  }

  /** Valida refresh; rotaciona; detecta reuse → invalida família. */
  async refresh(rawToken: string, getUser: (id: string) => Promise<User>, req?: Request) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const found = await this.repo.findOne({ where: { tokenHash } });
    if (!found) throw new UnauthorizedException('Refresh token inválido');
    if (found.revoked) throw new UnauthorizedException('Refresh token revogado');
    if (found.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expirado');

    if (found.used) {
      // REUSE DETECTED — possível roubo. Invalida toda família.
      this.logger.warn(`Reuse detected for family ${found.familyId} user ${found.userId}`);
      await this.repo.update({ familyId: found.familyId }, { revoked: true });
      throw new UnauthorizedException('Token reutilizado — sessão revogada por segurança');
    }

    const user = await getUser(found.userId);
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const pair = await this.rotate(user, found.familyId, req, found.id);
    return pair;
  }

  /** Logout: revoga toda a família. */
  async revokeFamily(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const found = await this.repo.findOne({ where: { tokenHash } });
    if (!found) return;
    await this.repo.update({ familyId: found.familyId }, { revoked: true });
  }

  /** Lista sessões ativas do usuário. */
  async listSessions(userId: string) {
    const rows = await this.repo.find({
      where: { userId, revoked: false },
      order: { createdAt: 'DESC' },
    });
    // Agrupa por família (1 família = 1 sessão)
    const byFamily = new Map<string, any>();
    for (const r of rows) {
      const existing = byFamily.get(r.familyId);
      if (!existing || new Date(r.createdAt) > new Date(existing.lastActive)) {
        byFamily.set(r.familyId, {
          familyId: r.familyId,
          userAgent: r.userAgent,
          ipMasked: r.ipMasked,
          createdAt: r.createdAt,
          lastActive: r.createdAt,
          expiresAt: r.expiresAt,
        });
      }
    }
    return [...byFamily.values()];
  }

  /** Revoga uma sessão específica (por familyId). */
  async revokeSession(userId: string, familyId: string) {
    await this.repo.update({ userId, familyId }, { revoked: true });
    return { ok: true };
  }

  /** Revoga todas as sessões exceto a atual. */
  async revokeAllExcept(userId: string, keepFamilyId: string) {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ revoked: true })
      .where('userId = :userId AND familyId != :fam', { userId, fam: keepFamilyId })
      .execute();
    return { ok: true };
  }

  private maskIp(req?: Request): string | null {
    if (!req) return null;
    const fwd = req.headers['x-forwarded-for'];
    const ip = (typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || '';
    if (!ip) return null;
    if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + ':0:0:0:0';
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : ip;
  }
}
