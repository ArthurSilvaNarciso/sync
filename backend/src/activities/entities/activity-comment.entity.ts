import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Activity } from './activity.entity';

@Entity('activity_comments')
export class ActivityComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column()
  activity_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column({ type: 'text' })
  content: string;

  // Array de user IDs mencionados (parsed do content). Vazio quando nenhum.
  @Column({ type: 'simple-array', default: '' })
  mentioned_user_ids: string[];

  @CreateDateColumn()
  createdAt: Date;
}
