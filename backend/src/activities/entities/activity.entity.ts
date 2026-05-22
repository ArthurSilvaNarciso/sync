import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ActivityPoint } from './activity-point.entity';

// Atividade esportiva registrada (tipo Strava)
@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ length: 50 })
  sport: string;

  @Column()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  // Distancia em metros
  @Column({ type: 'real', default: 0 })
  distance: number;

  // Duracao em segundos
  @Column({ type: 'integer', default: 0 })
  duration: number;

  // Pace medio em min/km
  @Column({ type: 'real', nullable: true })
  avgPace: number;

  // Velocidade media em km/h
  @Column({ type: 'real', nullable: true })
  avgSpeed: number;

  @Column({ default: false })
  isCompleted: boolean;

  // Token público para compartilhar tracking ao vivo. null = não compartilhado.
  @Column({ type: 'varchar', nullable: true })
  liveToken: string | null;

  // Expiração do token público — auto-revoga após 24h ou ao finalizar.
  @Column({ type: process.env.NODE_ENV === 'production' ? 'timestamp' : 'datetime', nullable: true })
  liveTokenExpiresAt: Date | null;

  @OneToMany(() => ActivityPoint, (point) => point.activity)
  points: ActivityPoint[];

  @CreateDateColumn()
  createdAt: Date;
}
