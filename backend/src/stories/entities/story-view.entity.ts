import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Story } from './story.entity';

// Quem viu cada story — pra impedir contagem duplicada e mostrar "visto por X"
@Entity('story_views')
@Unique(['story_id', 'viewer_id'])
export class StoryView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Story, (story) => story.views, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'story_id' })
  story: Story;

  @Column()
  story_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viewer_id' })
  viewer: User;

  @Column()
  viewer_id: string;

  @CreateDateColumn()
  viewedAt: Date;
}
