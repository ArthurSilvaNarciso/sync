import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('activity_feed_posts')
export class ActivityFeedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'activity_id', type: 'varchar', nullable: true })
  activity_id: string | null;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ type: 'text', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'float', default: 0 })
  distanceKm: number;

  @Column({ default: 0 })
  durationSeconds: number;

  @Column({ type: 'float', default: 0 })
  avgPace: number;

  @Column({ default: 0 })
  calories: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  sport: string | null;

  @Column({ default: 0 })
  likesCount: number;

  @Column({ default: 0 })
  commentsCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
