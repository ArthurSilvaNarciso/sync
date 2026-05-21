import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Token de push notification (Expo Push) por device
@Entity('push_tokens')
@Unique(['user_id', 'token'])
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string;

  @Column()
  token: string;

  @Column({ default: 'expo' })
  provider: 'expo' | 'fcm' | 'apns';

  @Column({ nullable: true })
  platform: string;             // 'ios' | 'android' | 'web'

  @Column({ nullable: true, type: 'varchar' })
  deviceName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastSeenAt: Date;
}
