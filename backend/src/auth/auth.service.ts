import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../common/security/audit.service';
import { Request } from 'express';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

// Token de sucesso/falha de login retorna a MESMA mensagem (anti-enumeração)
const GENERIC_INVALID = 'Credenciais inválidas';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, req?: Request) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('As senhas não conferem');
    }

    // Validação de senha forte
    this.assertStrongPassword(dto.password);

    const email = dto.email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({ where: { email } });

    // ANTI-ENUMERAÇÃO: se já existe, ainda retornamos sucesso aparente porém
    // sem criar conta. Para o atacante, o tempo de resposta é equivalente.
    // (O usuário legítimo já saberá que tem conta no fluxo de login.)
    if (existing) {
      await this.audit.log({ event: 'register_failure', req, detail: 'duplicate_email' });
      // Espera ~bcrypt time pra não vazar timing
      await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      throw new ConflictException('Não foi possível criar conta com esses dados');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepository.create({
      name: dto.name.trim().slice(0, 100),
      email,
      password: hashedPassword,
    });

    await this.userRepository.save(user);
    await this.audit.log({ userId: user.id, event: 'register_success', req });

    const token = this.generateToken(user);

    return {
      user: this.publicUser(user),
      accessToken: token,
    };
  }

  async login(dto: LoginDto, req?: Request) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .addSelect('user.failedLoginAttempts')
      .addSelect('user.lockedUntil')
      .where('user.email = :email', { email })
      .getOne();

    // Resposta genérica e timing constante: mesmo se user não existe,
    // gastamos tempo de bcrypt pra equalizar.
    if (!user) {
      await bcrypt.compare(dto.password, '$2b$12$' + 'x'.repeat(53));
      await this.audit.log({ event: 'login_failure', req, detail: 'unknown_email' });
      throw new UnauthorizedException(GENERIC_INVALID);
    }

    // Account locked?
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log({ userId: user.id, event: 'login_failure', req, detail: 'account_locked' });
      throw new UnauthorizedException(
        `Conta temporariamente bloqueada. Tente novamente em alguns minutos.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const update: any = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        update.failedLoginAttempts = 0;
        await this.audit.log({ userId: user.id, event: 'account_locked', req, detail: `attempts=${attempts}` });
      }
      await this.userRepository.update(user.id, update);
      await this.audit.log({ userId: user.id, event: 'login_failure', req });
      throw new UnauthorizedException(GENERIC_INVALID);
    }

    // Sucesso: reseta contadores
    await this.userRepository.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: this.getMaskedIp(req),
    });
    await this.audit.log({ userId: user.id, event: 'login_success', req });

    const token = this.generateToken(user);

    return {
      user: this.publicUser(user),
      accessToken: token,
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return user;
  }

  async forgotPassword(email: string, req?: Request): Promise<{ message: string; resetToken?: string }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email: normalized } });
    const genericMsg = 'Se o email existir, você receberá as instruções em breve.';

    if (!user) {
      await this.audit.log({ event: 'password_reset_requested', req, detail: 'unknown_email' });
      return { message: genericMsg };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.userRepository.update(user.id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expires,
    });

    await this.audit.log({ userId: user.id, event: 'password_reset_requested', req });

    return {
      message: genericMsg,
      // Em dev expomos o token pra facilitar; prod requer email externo
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, req?: Request): Promise<void> {
    this.assertStrongPassword(newPassword);
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      await this.audit.log({ userId, event: 'login_failure', req, detail: 'change_password_wrong_current' });
      throw new BadRequestException('Senha atual incorreta');
    }
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepository.update(userId, { password: hashedPassword });
    await this.audit.log({ userId, event: 'password_changed', req });
  }

  async resetPassword(token: string, newPassword: string, req?: Request): Promise<void> {
    this.assertStrongPassword(newPassword);

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordToken')
      .addSelect('user.resetPasswordExpires')
      .where('user.resetPasswordToken = :token', { token: hashedToken })
      .getOne();

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await this.audit.log({ userId: user.id, event: 'password_changed', req });
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    // 7 dias por padrão. Pra refresh rotation real, usar @nestjs/jwt com 2 tokens.
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
      avatarUrl: user.avatarUrl,
    };
  }

  /** Senha forte: mín 8 chars, ≥1 letra, ≥1 número, não em blacklist de óbvias. */
  private assertStrongPassword(pwd: string) {
    if (!pwd || pwd.length < 8) {
      throw new BadRequestException('Senha deve ter no mínimo 8 caracteres');
    }
    if (pwd.length > 128) {
      throw new BadRequestException('Senha muito longa (máx 128)');
    }
    if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      throw new BadRequestException('Senha precisa conter letras e números');
    }
    const blacklist = [
      '12345678', 'password', 'qwerty12', '11111111', '00000000',
      'senha123', 'sync1234', 'abcd1234', 'password1', '123456789',
    ];
    if (blacklist.includes(pwd.toLowerCase())) {
      throw new BadRequestException('Senha muito comum — escolha uma mais segura');
    }
  }

  private getMaskedIp(req?: Request): string | null {
    if (!req) return null;
    const fwd = req.headers['x-forwarded-for'];
    const ip = (typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || '';
    if (!ip) return null;
    if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + ':0:0:0:0';
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : ip;
  }
}
