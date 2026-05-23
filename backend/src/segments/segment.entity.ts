// Segments estilo Strava — trecho de rota com ranking (KOM/QOM).
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('segments')
export class Segment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'real' })
  distanceMeters: number;

  // Coordenadas start/end
  @Column({ type: 'real' })
  startLat: number;

  @Column({ type: 'real' })
  startLng: number;

  @Column({ type: 'real' })
  endLat: number;

  @Column({ type: 'real' })
  endLng: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 40, default: 'running' })
  sport: string;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @Column({ default: 0 })
  attemptsCount: number;

  // Best time (segundos) — KOM/QOM
  @Column({ type: 'int', nullable: true })
  bestTimeSec: number | null;

  @Column({ name: 'best_user_id', type: 'varchar', nullable: true })
  bestUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
