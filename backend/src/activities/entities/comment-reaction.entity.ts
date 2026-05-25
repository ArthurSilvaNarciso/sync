import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ActivityComment } from './activity-comment.entity';

@Entity('comment_reactions')
@Unique(['comment_id', 'user_id', 'emoji'])
@Index(['comment_id'])
export class CommentReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ActivityComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: ActivityComment;

  @Column()
  comment_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  // Apenas emoji curtos validados no service. Limite 8 chars para segurança.
  @Column({ type: 'varchar', length: 8 })
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;
}
