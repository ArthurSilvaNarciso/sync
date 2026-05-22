import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, SecurityEvent } from './audit-log.entity';
import { Request } from 'express';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(opts: {
    userId?: string | null;
    event: SecurityEvent;
    req?: Request;
    detail?: string;
  }) {
    try {
      await this.repo.save(
        this.repo.create({
          userId: opts.userId || null,
          event: opts.event,
          ipMasked: opts.req ? this.maskIp(this.getIp(opts.req)) : null,
          userAgent: opts.req?.headers['user-agent']?.toString().slice(0, 500) || null,
          detail: opts.detail || null,
        }),
      );
    } catch (e) {
      this.logger.warn(`Audit log failed: ${(e as Error).message}`);
    }
  }

  private getIp(req: Request): string {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
    return req.socket?.remoteAddress || '';
  }

  /** Mascara IP: IPv4 zera último octeto; IPv6 zera tudo após /64. */
  private maskIp(ip: string): string {
    if (!ip) return '';
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + ':0:0:0:0';
    }
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    return ip;
  }

  async countFailedLogins(userId: string, minutes = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.repo
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.event = :event', { event: 'login_failure' })
      .andWhere('log.createdAt >= :since', { since })
      .getCount();
  }
}
