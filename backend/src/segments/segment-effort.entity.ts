// Tempo de um usuário num segment — popula o leaderboard (KOM/QOM).
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Segment } from './segment.entity';

@Entity('segment_efforts')
@Index(['segmentId', 'elapsedSec'])
export class SegmentEffort {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'segment_id', type: 'varchar' })
  segmentId: string;

  @ManyToOne(() => Segment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'segment_id' })
  segment: Segment;

  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Atividade de origem (opcional — efforts podem ser registrados avulsos)
  @Column({ name: 'activity_id', type: 'varchar', nullable: true })
  activityId: string | null;

  // Tempo no trecho, em segundos
  @Column({ name: 'elapsed_sec', type: 'int' })
  elapsedSec: number;

  @CreateDateColumn()
  createdAt: Date;
}
