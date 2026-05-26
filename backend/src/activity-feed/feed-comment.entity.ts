import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ActivityFeedPost } from './activity-feed.entity';

@Entity('feed_comments')
export class FeedComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id' })
  post_id: string;

  @ManyToOne(() => ActivityFeedPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: ActivityFeedPost;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn()
  createdAt: Date;
}
