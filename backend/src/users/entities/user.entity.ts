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
  bio: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  birthDate: string;

  // Array de esportes praticados, armazenado como string separada por virgula
  @Column({ type: 'simple-array', nullable: true })
  sports: string[];

  @Column({ type: 'varchar', default: SportLevel.BEGINNER })
  level: SportLevel;

  // Objetivos armazenados como string separada por virgula
  @Column({ type: 'simple-array', nullable: true })
  objectives: string[];

  // Disponibilidade armazenada como string separada por virgula
  @Column({ type: 'simple-array', nullable: true })
  availability: string[];

  // Geolocalizacao
  @Column({ type: 'real', nullable: true })
  latitude: number;

  @Column({ type: 'real', nullable: true })
  longitude: number;

  @Column({ nullable: true })
  city: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  onboardingCompleted: boolean;

  @Column({ nullable: true, select: false, type: 'varchar' })
  resetPasswordToken: string | null;

  @Column({ nullable: true, select: false, type: 'datetime' })
  resetPasswordExpires: Date | null;

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
