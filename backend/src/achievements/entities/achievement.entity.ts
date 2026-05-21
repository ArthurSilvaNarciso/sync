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
  // Primeiros passos
  FIRST_ACTIVITY = 'first_activity',
  FIRST_MATCH = 'first_match',
  FIRST_EVENT = 'first_event',
  FIRST_KUDOS = 'first_kudos',
  FIRST_STORY = 'first_story',
  FIRST_COMMENT = 'first_comment',
  PROFILE_COMPLETE = 'profile_complete',
  // Distância
  DISTANCE_10K = 'distance_10k',
  DISTANCE_50K = 'distance_50k',
  DISTANCE_100K = 'distance_100k',
  DISTANCE_500K = 'distance_500k',
  DISTANCE_1000K = 'distance_1000k',
  DISTANCE_2500K = 'distance_2500k',
  // Quantidade de atividades
  ACTIVITIES_10 = 'activities_10',
  ACTIVITIES_50 = 'activities_50',
  ACTIVITIES_100 = 'activities_100',
  ACTIVITIES_365 = 'activities_365',
  ACTIVITIES_1000 = 'activities_1000',
  // Streaks
  STREAK_3 = 'streak_3',
  STREAK_7 = 'streak_7',
  STREAK_14 = 'streak_14',
  STREAK_30 = 'streak_30',
  STREAK_100 = 'streak_100',
  STREAK_365 = 'streak_365',
  // Social
  SOCIAL_BUTTERFLY = 'social_butterfly',
  MATCHES_50 = 'matches_50',
  EVENT_CREATOR = 'event_creator',
  EVENTS_HOSTED_10 = 'events_hosted_10',
  EVENT_PARTICIPANT_10 = 'event_participant_10',
  SUPER_LIKER = 'super_liker',
  CHATTY = 'chatty',
  STORYTELLER = 'storyteller',
  // Performance
  SPEED_DEMON = 'speed_demon',
  PACE_5MIN = 'pace_5min',
  PACE_4MIN = 'pace_4min',
  LONG_RUN_21K = 'long_run_21k',
  LONG_RUN_42K = 'long_run_42k',
  // Horários
  EARLY_BIRD = 'early_bird',
  NIGHT_OWL = 'night_owl',
  SUNRISE_RUN = 'sunrise_run',
  MIDNIGHT_RUN = 'midnight_run',
  // Variety
  MULTI_SPORT = 'multi_sport',
  ALL_ROUNDER = 'all_rounder',
  // Climate / terrain
  RAIN_RUNNER = 'rain_runner',
  HEAT_WARRIOR = 'heat_warrior',
  COLD_HERO = 'cold_hero',
  HILL_CLIMBER = 'hill_climber',
  // Specials
  SHARED_LIVE = 'shared_live',
  FLASH_EVENT = 'flash_event',
  WEEKEND_WARRIOR = 'weekend_warrior',
  CONSISTENCY_KING = 'consistency_king',
  COMEBACK_KID = 'comeback_kid',
  CITY_EXPLORER = 'city_explorer',
  // Especiais sazonais
  NEW_YEAR_RUN = 'new_year_run',
  BIRTHDAY_RUN = 'birthday_run',
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
  // === NOVAS conquistas ===
  [AchievementType.FIRST_KUDOS]: {
    name: 'Reconhecido',
    description: 'Receba seu primeiro kudos',
    icon: '👏',
    xp: 25,
  },
  [AchievementType.FIRST_STORY]: {
    name: 'Storyteller',
    description: 'Poste seu primeiro story',
    icon: '📸',
    xp: 30,
  },
  [AchievementType.FIRST_COMMENT]: {
    name: 'Comunicativo',
    description: 'Faça seu primeiro comentário',
    icon: '💬',
    xp: 20,
  },
  [AchievementType.PROFILE_COMPLETE]: {
    name: 'Perfil Pro',
    description: 'Complete 100% do perfil (foto, bio, esportes)',
    icon: '✨',
    xp: 50,
  },
  [AchievementType.DISTANCE_1000K]: {
    name: 'Mil',
    description: 'Acumule 1000 km totais',
    icon: '🌟',
    xp: 2500,
  },
  [AchievementType.DISTANCE_2500K]: {
    name: 'Hall of Fame',
    description: '2500 km totais — você é referência',
    icon: '🏛️',
    xp: 5000,
  },
  [AchievementType.ACTIVITIES_365]: {
    name: 'Ano Inteiro',
    description: '365 atividades — uma por dia em média',
    icon: '📅',
    xp: 1500,
  },
  [AchievementType.ACTIVITIES_1000]: {
    name: 'Mil Treinos',
    description: '1000 atividades — lendário',
    icon: '🎖️',
    xp: 3000,
  },
  [AchievementType.STREAK_14]: {
    name: 'Duas Semanas',
    description: '14 dias seguidos de atividade',
    icon: '🔥',
    xp: 400,
  },
  [AchievementType.STREAK_100]: {
    name: '100 Dias',
    description: '100 dias consecutivos — hábito instalado',
    icon: '💯',
    xp: 3000,
  },
  [AchievementType.STREAK_365]: {
    name: 'Ano Imbatível',
    description: '365 dias seguidos — sobrehumano',
    icon: '🏔️',
    xp: 10000,
  },
  [AchievementType.MATCHES_50]: {
    name: 'Conector',
    description: '50 matches no app',
    icon: '🕸️',
    xp: 500,
  },
  [AchievementType.EVENTS_HOSTED_10]: {
    name: 'Anfitrião',
    description: '10 eventos organizados',
    icon: '🎪',
    xp: 600,
  },
  [AchievementType.EVENT_PARTICIPANT_10]: {
    name: 'Participativo',
    description: 'Participe de 10 eventos',
    icon: '🎟️',
    xp: 300,
  },
  [AchievementType.CHATTY]: {
    name: 'Tagarela',
    description: 'Envie 100 mensagens',
    icon: '💬',
    xp: 100,
  },
  [AchievementType.STORYTELLER]: {
    name: 'Cronista',
    description: 'Poste 30 stories',
    icon: '📖',
    xp: 300,
  },
  [AchievementType.PACE_5MIN]: {
    name: 'Sub-5',
    description: 'Pace abaixo de 5:00/km numa corrida',
    icon: '⚡',
    xp: 250,
  },
  [AchievementType.PACE_4MIN]: {
    name: 'Sub-4',
    description: 'Pace abaixo de 4:00/km — elite',
    icon: '⚡⚡',
    xp: 800,
  },
  [AchievementType.LONG_RUN_21K]: {
    name: 'Meia Maratona',
    description: 'Complete 21 km numa atividade',
    icon: '🏃‍♂️',
    xp: 500,
  },
  [AchievementType.LONG_RUN_42K]: {
    name: 'Maratonista',
    description: 'Complete 42 km numa atividade',
    icon: '🏆',
    xp: 1500,
  },
  [AchievementType.SUNRISE_RUN]: {
    name: 'Aurora',
    description: 'Treine durante o nascer do sol',
    icon: '🌄',
    xp: 75,
  },
  [AchievementType.MIDNIGHT_RUN]: {
    name: 'Meia-noite',
    description: 'Atividade entre 23h e 1h',
    icon: '🌙',
    xp: 100,
  },
  [AchievementType.ALL_ROUNDER]: {
    name: 'Polivalente',
    description: 'Pratique 5 esportes diferentes',
    icon: '🎯',
    xp: 400,
  },
  [AchievementType.RAIN_RUNNER]: {
    name: 'Sob Chuva',
    description: 'Treine em dia chuvoso',
    icon: '🌧️',
    xp: 100,
  },
  [AchievementType.HEAT_WARRIOR]: {
    name: 'Guerreiro do Sol',
    description: 'Treine com mais de 32°C',
    icon: '🔥',
    xp: 150,
  },
  [AchievementType.COLD_HERO]: {
    name: 'Frio Polar',
    description: 'Treine com menos de 10°C',
    icon: '🥶',
    xp: 150,
  },
  [AchievementType.HILL_CLIMBER]: {
    name: 'Escalador',
    description: 'Acumule 500m de elevação numa atividade',
    icon: '⛰️',
    xp: 300,
  },
  [AchievementType.SHARED_LIVE]: {
    name: 'Em Tempo Real',
    description: 'Compartilhe seu primeiro tracking ao vivo',
    icon: '📡',
    xp: 75,
  },
  [AchievementType.FLASH_EVENT]: {
    name: 'Relâmpago',
    description: 'Crie ou participe de evento relâmpago',
    icon: '⚡',
    xp: 100,
  },
  [AchievementType.WEEKEND_WARRIOR]: {
    name: 'Final de Semana',
    description: 'Treine 4 finais de semana consecutivos',
    icon: '🗓️',
    xp: 200,
  },
  [AchievementType.CONSISTENCY_KING]: {
    name: 'Rei da Consistência',
    description: 'Treine pelo menos 3x/semana por 3 meses',
    icon: '👑',
    xp: 800,
  },
  [AchievementType.COMEBACK_KID]: {
    name: 'Volta por Cima',
    description: 'Treine após 30+ dias parado',
    icon: '🔄',
    xp: 150,
  },
  [AchievementType.CITY_EXPLORER]: {
    name: 'Explorador',
    description: 'Treine em 3 cidades diferentes',
    icon: '🗺️',
    xp: 250,
  },
  [AchievementType.NEW_YEAR_RUN]: {
    name: 'Ano Novo',
    description: 'Treine no dia 1 de janeiro',
    icon: '🎆',
    xp: 200,
  },
  [AchievementType.BIRTHDAY_RUN]: {
    name: 'Aniversário Ativo',
    description: 'Treine no seu aniversário',
    icon: '🎂',
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
