import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EventParticipant } from './event-participant.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  sport: string;

  @Column()
  date: Date;

  // Localizacao do evento
  @Column({ type: 'real' })
  latitude: number;

  @Column({ type: 'real' })
  longitude: number;

  @Column({ nullable: true })
  address: string;

  @Column({ default: 10 })
  maxParticipants: number;

  // Evento relâmpago: criado em <2h, push pra galera no raio na hora
  @Column({ default: false })
  isFlash: boolean;

  @ManyToOne(() => User, (user) => user.createdEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column()
  creator_id: string;

  @OneToMany(() => EventParticipant, (ep) => ep.event)
  participants: EventParticipant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
