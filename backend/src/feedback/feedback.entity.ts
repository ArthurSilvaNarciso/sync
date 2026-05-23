// Feedback de usuários — bug reports, sugestões, avaliações do app
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export type FeedbackType = 'bug' | 'suggestion' | 'rating' | 'support';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 20 })
  type: FeedbackType;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', nullable: true, length: 200 })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
