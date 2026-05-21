// Tipos compartilhados do Sync - espelham as entidades do backend

export enum SportLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: string;
  sports?: string[];
  level: SportLevel;
  objectives?: string[];
  availability?: string[];
  latitude?: number;
  longitude?: number;
  city?: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface DiscoveryUser extends User {
  distance: number; // km
}

export interface MatchResult {
  matched: boolean;
  matchId?: string;
}

export interface MatchItem {
  matchId: string;
  user: User;
  createdAt: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: User;
}

export interface Conversation {
  matchId: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  sport: string;
  date: string;
  latitude: number;
  longitude: number;
  address?: string;
  maxParticipants: number;
  creator_id: string;
  creator?: User;
  participantCount?: number;
  distance?: number;
}

export interface Activity {
  id: string;
  user_id: string;
  sport: string;
  startTime: string;
  endTime?: string;
  distance: number; // metros
  duration: number; // segundos
  avgPace?: number; // min/km
  avgSpeed?: number; // km/h
  isCompleted: boolean;
  points?: ActivityPoint[];
}

export interface ActivityPoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
}

export interface RankingItem {
  position: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  city?: string;
  totalDistance: number;
  totalDistanceKm: number;
  totalActivities: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// Dados de onboarding
export interface OnboardingData {
  sports: string[];
  level: SportLevel;
  objectives: string[];
  availability: string[];
  latitude?: number;
  longitude?: number;
  city?: string;
}

// Opções de esportes disponíveis
export const SPORTS = [
  { id: 'running', label: 'Corrida', icon: 'run' },
  { id: 'cycling', label: 'Ciclismo', icon: 'bike' },
  { id: 'swimming', label: 'Natação', icon: 'swim' },
  { id: 'gym', label: 'Musculação', icon: 'dumbbell' },
  { id: 'yoga', label: 'Yoga', icon: 'yoga' },
  { id: 'football', label: 'Futebol', icon: 'soccer' },
  { id: 'basketball', label: 'Basquete', icon: 'basketball' },
  { id: 'tennis', label: 'Tênis', icon: 'tennis' },
  { id: 'hiking', label: 'Trilha', icon: 'hiking' },
  { id: 'crossfit', label: 'CrossFit', icon: 'fitness' },
  { id: 'martial_arts', label: 'Artes Marciais', icon: 'karate' },
  { id: 'dance', label: 'Dança', icon: 'dance' },
] as const;

export const OBJECTIVES = [
  { id: 'health', label: 'Saúde' },
  { id: 'social', label: 'Social' },
  { id: 'competitive', label: 'Competição' },
  { id: 'weight_loss', label: 'Emagrecer' },
  { id: 'muscle_gain', label: 'Ganhar massa' },
  { id: 'fun', label: 'Diversão' },
] as const;

export const AVAILABILITY = [
  { id: 'early_morning', label: 'Madrugada (5h-7h)' },
  { id: 'morning', label: 'Manhã (7h-12h)' },
  { id: 'afternoon', label: 'Tarde (12h-18h)' },
  { id: 'evening', label: 'Noite (18h-22h)' },
  { id: 'weekend', label: 'Fins de semana' },
] as const;

// Achievements
export interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  unlockedAt: string | null;
  isUnlocked: boolean;
}

export interface UserXP {
  totalXP: number;
  level: number;
  xpToNextLevel: number;
  progress: number; // 0-1
}

// Notifications
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: string;
  isRead: boolean;
  createdAt: string;
}

// Weather
export interface Weather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  uvIndex: number;
  isGoodForExercise: boolean;
}

export interface WeatherForecast {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  windSpeedMax: number;
  uvIndexMax: number;
}

export interface ExerciseRecommendation {
  bestTimeWindow: string;
  bestActivities: string[];
  recommendation: string;
}

// Stats
export interface UserStats {
  totalActivities: number;
  totalDistance: number;
  totalDuration: number;
  averagePace: number;
  averageSpeed: number;
  longestActivity: number;
  currentStreak: number;
  bestStreak: number;
  totalMatches: number;
  totalEvents: number;
  sportBreakdown: Array<{
    sport: string;
    count: number;
    totalDistance: number;
    totalDuration: number;
  }>;
  weeklyStats: Array<{
    date: string;
    distance: number;
    duration: number;
    count: number;
  }>;
}

// Event Comment
export interface EventComment {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
}
