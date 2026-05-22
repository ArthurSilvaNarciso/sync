// Planos de treino básicos — 5K (beginner), 10K (intermediate), 21K (advanced).
// Cliente-side, deterministicos. Cada plano tem N semanas, cada semana tem 3-4 sessões.

export type Workout = {
  type: 'easy' | 'long' | 'interval' | 'tempo' | 'recovery' | 'rest';
  title: string;
  description: string;
  targetKm?: number;
  targetMinutes?: number;
  paceHint?: string;
};

export type WeekPlan = {
  weekNumber: number;
  goal: string;
  workouts: Workout[];
};

export type TrainingPlan = {
  id: string;
  name: string;
  goalDistanceKm: number;
  weeks: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  plan: WeekPlan[];
};

const REST: Workout = { type: 'rest', title: 'Descanso', description: 'Recupere — alongamento leve' };

export const PLANS: TrainingPlan[] = [
  {
    id: '5k-8w',
    name: 'De zero aos 5K',
    goalDistanceKm: 5,
    weeks: 8,
    level: 'beginner',
    description: 'Para quem nunca correu. Mistura caminhada e corrida progressivamente.',
    plan: [
      {
        weekNumber: 1, goal: '20min alternando',
        workouts: [
          { type: 'easy', title: 'Run/Walk', description: '1min correr / 2min caminhar — 6x', targetMinutes: 20 },
          REST,
          { type: 'easy', title: 'Run/Walk', description: '1min correr / 2min caminhar — 6x', targetMinutes: 20 },
          REST,
          { type: 'long', title: 'Caminhada longa', description: '30min ritmo confortável', targetMinutes: 30 },
        ],
      },
      {
        weekNumber: 2, goal: '25min alternando',
        workouts: [
          { type: 'easy', title: 'Run/Walk', description: '2min correr / 2min caminhar — 6x', targetMinutes: 25 },
          REST,
          { type: 'easy', title: 'Run/Walk', description: '2min correr / 2min caminhar — 6x', targetMinutes: 25 },
          REST,
          { type: 'long', title: 'Run/Walk longo', description: '2min correr / 2min caminhar — 8x', targetMinutes: 35 },
        ],
      },
      {
        weekNumber: 3, goal: '3 a 5min de corrida contínua',
        workouts: [
          { type: 'easy', title: 'Run/Walk', description: '3min correr / 1min caminhar — 6x', targetMinutes: 25 },
          REST,
          { type: 'easy', title: 'Run/Walk', description: '3min correr / 1min caminhar — 6x', targetMinutes: 25 },
          REST,
          { type: 'long', title: 'Long', description: '5min correr / 1min caminhar — 5x', targetMinutes: 35 },
        ],
      },
      {
        weekNumber: 4, goal: '8min corrida contínua',
        workouts: [
          { type: 'easy', title: 'Easy', description: '5min correr / 1min caminhar — 5x', targetMinutes: 30 },
          REST,
          { type: 'tempo', title: 'Tempo', description: '8min correr / 2min caminhar — 3x', targetMinutes: 30 },
          REST,
          { type: 'long', title: 'Long', description: 'Tente 10min seguidos de corrida + caminhada', targetMinutes: 40 },
        ],
      },
      {
        weekNumber: 5, goal: '15min corrida contínua',
        workouts: [
          { type: 'easy', title: 'Easy', description: '15min corrida + 10min caminhada', targetMinutes: 25 },
          REST,
          { type: 'tempo', title: 'Tempo', description: '10min correr forte + 5min caminhar — 2x', targetMinutes: 30 },
          REST,
          { type: 'long', title: 'Long', description: '20min corrida contínua', targetMinutes: 40 },
        ],
      },
      {
        weekNumber: 6, goal: '25min contínuo',
        workouts: [
          { type: 'easy', title: 'Easy', description: '25min corrida contínua, ritmo de conversa', targetMinutes: 25 },
          REST,
          { type: 'interval', title: 'Intervalos', description: '1min forte / 1min trote — 8x', targetMinutes: 25 },
          REST,
          { type: 'long', title: 'Long', description: '30min corrida contínua', targetMinutes: 30 },
        ],
      },
      {
        weekNumber: 7, goal: '4K contínuo',
        workouts: [
          { type: 'easy', title: 'Easy', description: '4K ritmo confortável', targetKm: 4 },
          REST,
          { type: 'interval', title: 'Intervalos', description: '400m forte / 200m trote — 6x', targetMinutes: 30 },
          REST,
          { type: 'long', title: 'Long', description: '5K ritmo controlado (sem pressa)', targetKm: 5 },
        ],
      },
      {
        weekNumber: 8, goal: '🏁 5K race!',
        workouts: [
          { type: 'easy', title: 'Easy', description: '3K leve', targetKm: 3 },
          REST,
          { type: 'tempo', title: 'Tempo curto', description: '2K rápido', targetKm: 2 },
          REST,
          { type: 'long', title: '🎯 5K Race', description: 'Sua primeira corrida de 5K! Pace constante.', targetKm: 5 },
        ],
      },
    ],
  },
  {
    id: '10k-10w',
    name: 'Rumo aos 10K',
    goalDistanceKm: 10,
    weeks: 10,
    level: 'intermediate',
    description: 'Para quem já corre 5K. Constrói resistência e velocidade.',
    plan: Array.from({ length: 10 }).map((_, i) => ({
      weekNumber: i + 1,
      goal: `Semana ${i + 1} — ${i < 5 ? 'base aeróbica' : i < 8 ? 'velocidade' : 'pico + taper'}`,
      workouts: [
        { type: 'easy', title: 'Easy', description: `${3 + Math.min(2, i)}K ritmo confortável`, targetKm: 3 + Math.min(2, i) },
        REST,
        i < 7
          ? { type: 'tempo', title: 'Tempo', description: `${2 + Math.floor(i / 2)}K em pace tempo (5K+30s)`, targetKm: 2 + Math.floor(i / 2) }
          : { type: 'interval', title: 'Intervalos', description: '6x 400m forte / 200m trote', targetMinutes: 30 },
        REST,
        { type: 'long', title: 'Long', description: `${5 + i}K ritmo conversável`, targetKm: 5 + i },
      ],
    })),
  },
  {
    id: '21k-12w',
    name: 'Meia maratona (21K)',
    goalDistanceKm: 21.1,
    weeks: 12,
    level: 'advanced',
    description: 'Para quem já corre 10K. Plano de 12 semanas com tempo runs e long runs progressivos.',
    plan: Array.from({ length: 12 }).map((_, i) => ({
      weekNumber: i + 1,
      goal: i < 4 ? 'Base' : i < 8 ? 'Build' : i < 11 ? 'Peak' : 'Taper / Race',
      workouts: [
        { type: 'easy', title: 'Recovery', description: `${4 + Math.min(2, i / 2)}K trote leve`, targetKm: 4 + Math.min(2, i / 2) },
        { type: 'tempo', title: 'Tempo', description: `${3 + Math.floor(i / 2)}K em pace de meia`, targetKm: 3 + Math.floor(i / 2) },
        REST,
        { type: 'interval', title: 'Intervalos', description: '8x 1000m forte / 200m trote', targetMinutes: 50 },
        REST,
        { type: 'long', title: 'Long', description: i === 11 ? '🏁 21K Race!' : `${8 + i * 1.2}K ritmo conversável`, targetKm: i === 11 ? 21.1 : 8 + i * 1.2 },
      ],
    })),
  },
];

export function getPlanById(id: string): TrainingPlan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getCurrentWeek(plan: TrainingPlan, startDate: Date): WeekPlan | null {
  const diffDays = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weekIndex = Math.floor(diffDays / 7);
  return plan.plan[Math.min(weekIndex, plan.plan.length - 1)] || null;
}
