// Daily Quests rotativas — determinísticas pela data, mesmo conjunto pra todos os usuários
// no mesmo dia. Reset à meia-noite.

export interface Quest {
  id: string;
  icon: string;
  title: string;
  description: string;
  target: number;
  type: 'distance' | 'activity' | 'pace' | 'time' | 'social' | 'streak';
  xpReward: number;
}

const POOL: Quest[] = [
  { id: 'd1', icon: '🏃', title: 'Aquecimento',        description: 'Corra 3 km hoje',                       target: 3,   type: 'distance', xpReward: 50 },
  { id: 'd2', icon: '🔥', title: 'Long Run',            description: 'Corra 8 km hoje',                       target: 8,   type: 'distance', xpReward: 150 },
  { id: 'd3', icon: '🚴', title: 'Pedalada',            description: 'Pedale 15 km hoje',                     target: 15,  type: 'distance', xpReward: 100 },
  { id: 'd4', icon: '⏱️', title: 'Speedy',              description: 'Pace médio abaixo de 5:30/km',          target: 5.5, type: 'pace',     xpReward: 200 },
  { id: 'd5', icon: '💪', title: 'Resistência',         description: 'Treine por 45 minutos',                 target: 45,  type: 'time',     xpReward: 100 },
  { id: 'd6', icon: '👯', title: 'Match social',        description: 'Dê match com 3 atletas hoje',           target: 3,   type: 'social',   xpReward: 75 },
  { id: 'd7', icon: '🔁', title: 'Consistência',        description: 'Complete 2 atividades hoje',            target: 2,   type: 'activity', xpReward: 120 },
  { id: 'd8', icon: '🌅', title: 'Madrugador',          description: 'Treine antes das 8h da manhã',          target: 1,   type: 'activity', xpReward: 80 },
  { id: 'd9', icon: '🌙', title: 'Coruja noturna',      description: 'Treine depois das 20h',                 target: 1,   type: 'activity', xpReward: 80 },
  { id: 'd10', icon: '⛰️', title: 'Subindo',            description: 'Subida acumulada de 100m',              target: 100, type: 'distance', xpReward: 150 },
  { id: 'd11', icon: '📸', title: 'Compartilhe',        description: 'Poste um story do seu treino',          target: 1,   type: 'social',   xpReward: 60 },
  { id: 'd12', icon: '❤️',  title: 'Curtir e curtir',   description: 'Dê 5 kudos em atividades de amigos',    target: 5,   type: 'social',   xpReward: 50 },
];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getTodayQuests(date = new Date()): Quest[] {
  const day = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return seededShuffle(POOL, day).slice(0, 3);
}

export function questsResetCountdown(date = new Date()): { hours: number; minutes: number } {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  const ms = next.getTime() - date.getTime();
  return { hours: Math.floor(ms / 3600000), minutes: Math.floor((ms % 3600000) / 60000) };
}
