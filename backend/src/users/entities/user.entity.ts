import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Like } from '../../matching/entities/like.entity';
import { Match } from '../../matching/entities/match.entity';
import { Message } from '../../chat/entities/message.entity';
import { Event } from '../../events/entities/event.entity';
import { EventParticipant } from '../../events/entities/event-participant.entity';
import { Activity } from '../../activities/entities/activity.entity';

// Enum para nível esportivo do usuário
export enum SportLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bannerUrl: string | null;

  // Fotos do perfil (mínimo 3 na criação). Armazenado como JSON array de data URLs.
  @Column({ type: 'simple-json', nullable: true })
  profilePhotos: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  birthDate: string | null;

  // Dados físicos para cálculo de calorias
  @Column({ type: 'real', nullable: true })
  weightKg: number | null;

  @Column({ type: 'real', nullable: true })
  heightCm: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  // Array de esportes praticados, armazenado como string separada por virgula
  @Column({ type: 'simple-array', nullable: true })
  sports: string[] | null;

  @Column({ type: 'varchar', default: SportLevel.BEGINNER })
  level: SportLevel;

  // Objetivos armazenados como string separada por virgula
  @Column({ type: 'simple-array', nullable: true })
  objectives: string[] | null;

  // Disponibilidade armazenada como string separada por virgula
  @Column({ type: 'simple-array', nullable: true })
  availability: string[] | null;

  // Geolocalizacao
  @Column({ type: 'real', nullable: true })
  latitude: number | null;

  @Column({ type: 'real', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  onboardingCompleted: boolean;

  @Column({ nullable: true, select: false, type: 'varchar' })
  resetPasswordToken: string | null;

  @Column({ type: process.env.NODE_ENV === 'production' ? 'timestamp' : 'datetime', nullable: true, select: false })
  resetPasswordExpires: Date | null;

  // Account lockout / brute-force defense
  @Column({ default: 0, select: false })
  failedLoginAttempts: number;

  @Column({ type: process.env.NODE_ENV === 'production' ? 'timestamp' : 'datetime', nullable: true, select: false })
  lockedUntil: Date | null;

  @Column({ type: process.env.NODE_ENV === 'production' ? 'timestamp' : 'datetime', nullable: true, select: false })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  lastLoginIp: string | null;

  // 2FA TOTP secret (opcional)
  @Column({ nullable: true, select: false, type: 'varchar' })
  twoFactorSecret: string | null;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  // Subscription tier (free | premium | atleta_pro). Stripe-ready.
  @Column({ type: 'varchar', length: 20, default: 'free' })
  subscriptionTier: string;

  @Column({ type: process.env.NODE_ENV === 'production' ? 'timestamp' : 'datetime', nullable: true })
  subscriptionExpiresAt: Date | null;

  // Verified badge — set by admins for known athletes / coaches / gyms
  @Column({ default: false })
  isVerified: boolean;

  // Cron timestamps
  @Column({ default: 0 })
  totalXP: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relações
  @OneToMany(() => Like, (like) => like.fromUser)
  sentLikes: Like[];

  @OneToMany(() => Like, (like) => like.toUser)
  receivedLikes: Like[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Event, (event) => event.creator)
  createdEvents: Event[];

  @OneToMany(() => EventParticipant, (ep) => ep.user)
  eventParticipations: EventParticipant[];

  @OneToMany(() => Activity, (activity) => activity.user)
  activities: Activity[];
}
