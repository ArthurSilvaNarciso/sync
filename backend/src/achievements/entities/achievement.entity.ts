import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AchievementType {
  FIRST_ACTIVITY = 'first_activity',
  FIRST_MATCH = 'first_match',
  FIRST_EVENT = 'first_event',
  DISTANCE_10K = 'distance_10k',
  DISTANCE_50K = 'distance_50k',
  DISTANCE_100K = 'distance_100k',
  DISTANCE_500K = 'distance_500k',
  ACTIVITIES_10 = 'activities_10',
  ACTIVITIES_50 = 'activities_50',
  ACTIVITIES_100 = 'activities_100',
  STREAK_3 = 'streak_3',
  STREAK_7 = 'streak_7',
  STREAK_30 = 'streak_30',
  SOCIAL_BUTTERFLY = 'social_butterfly',
  EVENT_CREATOR = 'event_creator',
  SUPER_LIKER = 'super_liker',
  SPEED_DEMON = 'speed_demon',
  EARLY_BIRD = 'early_bird',
  NIGHT_OWL = 'night_owl',
  MULTI_SPORT = 'multi_sport',
}

export const ACHIEVEMENT_INFO: Record<
  AchievementType,
  { name: string; description: string; icon: string; xp: number }
> = {
  [AchievementType.FIRST_ACTIVITY]: {
    name: 'Primeiro Passo',
    description: 'Complete sua primeira atividade',
    icon: '🏃',
    xp: 50,
  },
  [AchievementType.FIRST_MATCH]: {
    name: 'Conexão',
    description: 'Faça seu primeiro match',
    icon: '🤝',
    xp: 50,
  },
  [AchievementType.FIRST_EVENT]: {
    name: 'Organizador',
    description: 'Crie seu primeiro evento',
    icon: '📅',
    xp: 50,
  },
  [AchievementType.DISTANCE_10K]: {
    name: 'Corredor 10K',
    description: 'Percorra 10km no total',
    icon: '🏅',
    xp: 100,
  },
  [AchievementType.DISTANCE_50K]: {
    name: 'Maratonista',
    description: 'Percorra 50km no total',
    icon: '🥈',
    xp: 200,
  },
  [AchievementType.DISTANCE_100K]: {
    name: 'Ultra Runner',
    description: 'Percorra 100km no total',
    icon: '🥇',
    xp: 500,
  },
  [AchievementType.DISTANCE_500K]: {
    name: 'Lenda',
    description: 'Percorra 500km no total',
    icon: '👑',
    xp: 1000,
  },
  [AchievementType.ACTIVITIES_10]: {
    name: 'Consistente',
    description: 'Complete 10 atividades',
    icon: '💪',
    xp: 100,
  },
  [AchievementType.ACTIVITIES_50]: {
    name: 'Dedicado',
    description: 'Complete 50 atividades',
    icon: '🔥',
    xp: 300,
  },
  [AchievementType.ACTIVITIES_100]: {
    name: 'Máquina',
    description: 'Complete 100 atividades',
    icon: '⚡',
    xp: 500,
  },
  [AchievementType.STREAK_3]: {
    name: 'Sequência 3',
    description: '3 dias seguidos de atividade',
    icon: '🔥',
    xp: 75,
  },
  [AchievementType.STREAK_7]: {
    name: 'Semana Perfeita',
    description: '7 dias seguidos de atividade',
    icon: '🌟',
    xp: 200,
  },
  [AchievementType.STREAK_30]: {
    name: 'Mês Imbatível',
    description: '30 dias seguidos de atividade',
    icon: '💎',
    xp: 1000,
  },
  [AchievementType.SOCIAL_BUTTERFLY]: {
    name: 'Social',
    description: 'Tenha 10 matches',
    icon: '🦋',
    xp: 150,
  },
  [AchievementType.EVENT_CREATOR]: {
    name: 'Líder',
    description: 'Crie 5 eventos',
    icon: '🎯',
    xp: 200,
  },
  [AchievementType.SUPER_LIKER]: {
    name: 'Super Fan',
    description: 'Envie 10 super likes',
    icon: '⭐',
    xp: 100,
  },
  [AchievementType.SPEED_DEMON]: {
    name: 'Velocista',
    description: 'Atinja velocidade média acima de 15km/h',
    icon: '💨',
    xp: 150,
  },
  [AchievementType.EARLY_BIRD]: {
    name: 'Madrugador',
    description: 'Complete uma atividade antes das 6h',
    icon: '🌅',
    xp: 100,
  },
  [AchievementType.NIGHT_OWL]: {
    name: 'Coruja',
    description: 'Complete uma atividade após as 22h',
    icon: '🦉',
    xp: 100,
  },
  [AchievementType.MULTI_SPORT]: {
    name: 'Atleta Completo',
    description: 'Pratique 3 esportes diferentes',
    icon: '🏆',
    xp: 200,
  },
};

@Entity('user_achievements')
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  type: AchievementType;

  @CreateDateColumn()
  unlockedAt: Date;
}
