import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StoryView } from './story-view.entity';

// Stories de treino — foto/vídeo 24h vinculado a uma atividade.
@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column()
  mediaUrl: string;

  @Column({ default: 'image' })
  mediaType: 'image' | 'video';

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ type: 'varchar', nullable: true })
  activity_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  sport: string | null;

  // Distância em km vinculada (opcional)
  @Column({ type: 'real', nullable: true })
  distanceKm: number | null;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  likeCount: number;

  @CreateDateColumn()
  createdAt: Date;

  // Stories expiram em 24h — calculado em query
  @Column({
    type: process.env.NODE_ENV === 'production' ? 'timestamp' : 'datetime',
  })
  expiresAt: Date;

  @OneToMany(() => StoryView, (view) => view.story)
  views: StoryView[];
}
