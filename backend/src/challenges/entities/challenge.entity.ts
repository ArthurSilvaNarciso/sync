import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenger_id' })
  challenger: User;

  @Column()
  challenger_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenged_id' })
  challenged: User;

  @Column()
  challenged_id: string;

  // e.g. 'running', 'cycling'
  @Column({ type: 'varchar', length: 30 })
  sport: string;

  // e.g. 'distance' | 'pace' | 'duration'
  @Column({ type: 'varchar', length: 20 })
  metric: string;

  // Target value (km, min/km, minutes)
  @Column({ type: 'float' })
  target: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ChallengeStatus;

  // Winner user id, set when completed
  @Column({ type: 'varchar', nullable: true })
  winner_id: string | null;

  // Deadline ISO string
  @Column({ type: process.env.NODE_ENV === 'production' ? 'timestamp' : 'datetime', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
