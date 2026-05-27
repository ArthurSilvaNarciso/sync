import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  NEW_MATCH = 'new_match',
  NEW_MESSAGE = 'new_message',
  EVENT_REMINDER = 'event_reminder',
  EVENT_JOINED = 'event_joined',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  LIKE_RECEIVED = 'like_received',
  SUPER_LIKE_RECEIVED = 'super_like_received',
  WEEKLY_SUMMARY = 'weekly_summary',
  STREAK_WARNING = 'streak_warning',
  EVENT_STARTING_SOON = 'event_starting_soon',
  NEW_EVENT_NEARBY = 'new_event_nearby',
}

@Entity('notifications')
@Index(['user_id', 'createdAt']) // list unread notifications by user
@Index(['user_id', 'isRead'])   // unread count badge
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  type: NotificationType;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({ type: 'text', nullable: true })
  data: string | null;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
