// Rating pós-treino estilo Adidas Running Club.
// Energy: como se sentiu. Satisfaction: como achou o treino. Fatigue: nível de cansaço.
// Tudo opcional — usuário pode skip.
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Activity } from './activity.entity';
import { User } from '../../users/entities/user.entity';

export type RatingScale = 1 | 2 | 3 | 4 | 5;

@Entity('activity_ratings')
@Unique(['activity_id', 'user_id'])
export class ActivityRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'activity_id' })
  activity_id: string;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Energia: 1 = muito cansado, 5 = energético */
  @Column({ type: 'int', nullable: true })
  energy: number | null;

  /** Satisfação: 1 = ruim, 5 = ótimo */
  @Column({ type: 'int', nullable: true })
  satisfaction: number | null;

  /** Esforço percebido (RPE): 1 = leve, 10 = máximo */
  @Column({ type: 'int', nullable: true })
  rpe: number | null;

  /** Dor/desconforto: 0 = nenhuma, 5 = forte */
  @Column({ type: 'int', nullable: true })
  pain: number | null;

  /** Tipo de treino: easy / tempo / interval / long / recovery / race */
  @Column({ type: 'varchar', length: 20, nullable: true })
  workoutType: string | null;

  /** Como estava o tempo: sunny / cloudy / rainy / windy / cold / hot */
  @Column({ type: 'varchar', length: 20, nullable: true })
  weatherFelt: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
