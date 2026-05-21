import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Activity } from './activity.entity';

// Ponto GPS capturado durante uma atividade
// Cada ponto representa uma posição no percurso, permitindo desenhar a rota no mapa
@Entity('activity_points')
export class ActivityPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Activity, (activity) => activity.points, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column()
  activity_id: string;

  @Column({ type: 'real' })
  latitude: number;

  @Column({ type: 'real' })
  longitude: number;

  @Column({ type: 'real', nullable: true })
  altitude: number;

  @Column()
  timestamp: Date;
}
