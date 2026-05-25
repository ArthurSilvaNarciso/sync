/**
 * Calcula score de compatibilidade entre 2 usuários (0-100).
 *
 * Considera:
 * - Esportes em comum (peso maior)
 * - Mesmo nível esportivo
 * - Objetivos compatíveis
 * - Disponibilidade (dias da semana)
 * - Proximidade geográfica (bonus)
 *
 * Score pensado pra ser explicável e bonito de exibir.
 */

export interface CompatibilityInput {
  meSports?: string[] | null;
  themSports?: string[] | null;
  meLevel?: string | null;
  themLevel?: string | null;
  meObjectives?: string[] | null;
  themObjectives?: string[] | null;
  meAvailability?: string[] | null;
  themAvailability?: string[] | null;
  distanceKm?: number | null;
}

export interface CompatibilityResult {
  score: number; // 0-100
  tier: 'baixa' | 'media' | 'alta' | 'perfeita';
  color: string;
  emoji: string;
  reasons: string[];
  commonSports: string[];
}

export function calculateMatchCompatibility(input: CompatibilityInput): CompatibilityResult {
  const me = {
    sports: new Set((input.meSports || []).map(s => s.toLowerCase())),
    level: (input.meLevel || '').toLowerCase(),
    objectives: new Set((input.meObjectives || []).map(s => s.toLowerCase())),
    availability: new Set((input.meAvailability || []).map(s => s.toLowerCase())),
  };
  const them = {
    sports: new Set((input.themSports || []).map(s => s.toLowerCase())),
    level: (input.themLevel || '').toLowerCase(),
    objectives: new Set((input.themObjectives || []).map(s => s.toLowerCase())),
    availability: new Set((input.themAvailability || []).map(s => s.toLowerCase())),
  };

  let score = 0;
  const reasons: string[] = [];

  // Esportes em comum (até 50 pts)
  const commonSports = Array.from(me.sports).filter(s => them.sports.has(s));
  if (commonSports.length > 0) {
    const sportBonus = Math.min(50, commonSports.length * 18);
    score += sportBonus;
    reasons.push(
      commonSports.length === 1
        ? `Praticam ${commonSports[0]}`
        : `${commonSports.length} esportes em comum`,
    );
  }

  // Mesmo nível (até 15 pts)
  if (me.level && them.level && me.level === them.level) {
    score += 15;
    reasons.push('Mesmo nível esportivo');
  } else if (me.level && them.level) {
    // Niveis próximos (iniciante/intermediario, intermediario/avancado)
    const order = ['beginner', 'intermediate', 'advanced'];
    const diff = Math.abs(order.indexOf(me.level) - order.indexOf(them.level));
    if (diff === 1) {
      score += 7;
      reasons.push('Nível próximo');
    }
  }

  // Objetivos em comum (até 15 pts)
  const commonObjectives = Array.from(me.objectives).filter(o => them.objectives.has(o));
  if (commonObjectives.length > 0) {
    score += Math.min(15, commonObjectives.length * 7);
    reasons.push(
      commonObjectives.length === 1 ? 'Mesmo objetivo' : `${commonObjectives.length} objetivos em comum`,
    );
  }

  // Disponibilidade em comum (até 10 pts)
  const commonAvail = Array.from(me.availability).filter(d => them.availability.has(d));
  if (commonAvail.length > 0) {
    score += Math.min(10, commonAvail.length * 2);
    if (commonAvail.length >= 3) {
      reasons.push('Vários horários compatíveis');
    } else {
      reasons.push('Horários compatíveis');
    }
  }

  // Bonus por proximidade (até 10 pts)
  if (input.distanceKm != null && input.distanceKm >= 0) {
    if (input.distanceKm < 2) {
      score += 10;
      reasons.push('Bem perto de você');
    } else if (input.distanceKm < 5) {
      score += 7;
      reasons.push('Perto de você');
    } else if (input.distanceKm < 15) {
      score += 4;
    }
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  let tier: CompatibilityResult['tier'] = 'baixa';
  let color = '#9CA3AF';
  let emoji = '🤝';
  if (score >= 85) {
    tier = 'perfeita';
    color = '#10B981';
    emoji = '🔥';
  } else if (score >= 65) {
    tier = 'alta';
    color = '#FF6B35';
    emoji = '⭐';
  } else if (score >= 40) {
    tier = 'media';
    color = '#F59E0B';
    emoji = '✨';
  }

  return { score, tier, color, emoji, reasons, commonSports };
}
