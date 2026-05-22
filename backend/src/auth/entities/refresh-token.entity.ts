// Refresh token entity. Token armazenado HASHED (sha256) — nunca em claro.
// Rotação: cada uso emite novo token e invalida o anterior (família).
// Detecção de roubo: se o mesmo refresh é usado 2x, invalida toda família.
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index(['userId', 'familyId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Família = todos os refresh tokens descendentes de um login. */
  @Column({ length: 36 })
  familyId: string;

  /** SHA-256 hex do token em claro. */
  @Column({ length: 64 })
  tokenHash: string;

  @Column({ type: process.env.NODE_ENV === 'production' ? 'timestamp' : 'datetime' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ default: false })
  revoked: boolean;

  @Column({ type: 'varchar', nullable: true, length: 200 })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true, length: 45 })
  ipMasked: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
