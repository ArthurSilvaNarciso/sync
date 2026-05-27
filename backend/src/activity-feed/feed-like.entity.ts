import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ActivityFeedPost } from './activity-feed.entity';

/**
 * Rastreia likes por usuário × post.
 * Constraint UNIQUE (user_id, post_id) garante que um usuário
 * não possa curtir o mesmo post mais de uma vez.
 */
@Entity('feed_likes')
@Unique(['user_id', 'post_id'])
export class FeedLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'post_id' })
  post_id: string;

  @ManyToOne(() => ActivityFeedPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: ActivityFeedPost;

  @CreateDateColumn()
  createdAt: Date;
}
