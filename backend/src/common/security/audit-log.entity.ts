// Audit log de eventos de segurança (login, falha, troca de senha, etc).
// Retenção: ~90 dias. Não armazena PII além de userId + IP truncado.
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type SecurityEvent =
  | 'login_success'
  | 'login_failure'
  | 'account_locked'
  | 'password_reset_requested'
  | 'password_changed'
  | 'register_success'
  | 'register_failure'
  | 'token_refresh'
  | 'permission_denied'
  | 'suspicious_activity';

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['event', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, length: 64 })
  userId: string | null;

  @Column({ type: 'varchar', length: 40 })
  event: SecurityEvent;

  @Column({ type: 'varchar', nullable: true, length: 45 })
  ipMasked: string | null; // último octeto removido (IPv4) ou /64 (IPv6)

  @Column({ nullable: true, type: 'text' })
  userAgent: string | null;

  @Column({ nullable: true, type: 'text' })
  detail: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
