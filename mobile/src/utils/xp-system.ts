// Sistema de XP + Levels. Local (cliente). Backend pode futuramente persistir.
// XP source:
//   - 10 XP por km percorrido
//   - 50 XP por atividade concluída
//   - 100 XP por conquista desbloqueada
//   - 25 XP por dia em streak (multiplica com dias consecutivos)

export interface UserXP {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number; // 0..1
  title: string;
}

// Curva de XP por level: cresce ~1.5x por level até L100.
// L1: 100, L2: 250, L3: 450, L4: 700, L5: 1000... aproximação polinomial.
function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.6));
}

function totalXpRequired(level: number): number {
  // Soma cumulativa
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

const TITLES: Array<[number, string]> = [
  [1, 'Iniciante'],
  [5, 'Caminhante'],
  [10, 'Corredor'],
  [15, 'Atleta'],
  [25, 'Veterano'],
  [40, 'Maratonista'],
  [60, 'Ultra'],
  [80, 'Lendário'],
  [100, 'Imortal'],
];

export function computeUserXP(totalXP: number): UserXP {
  let level = 1;
  while (level < 100 && totalXpRequired(level + 1) <= totalXP) level++;
  const currentLevelXP = totalXP - totalXpRequired(level);
  const nextLevelXP = xpForLevel(level);
  const progress = Math.min(1, currentLevelXP / nextLevelXP);
  let title = TITLES[0][1];
  for (const [minLevel, name] of TITLES) {
    if (level >= minLevel) title = name;
  }
  return { totalXP, level, currentLevelXP, nextLevelXP, progress, title };
}

export function calculateXPFromStats(stats: {
  totalDistanceKm: number;
  totalActivities: number;
  achievementsCount: number;
  currentStreak: number;
}): number {
  return (
    Math.round(stats.totalDistanceKm * 10) +
    stats.totalActivities * 50 +
    stats.achievementsCount * 100 +
    stats.currentStreak * 25
  );
}
