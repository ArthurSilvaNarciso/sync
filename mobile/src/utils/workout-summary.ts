// Gera resumo natural de treino em português.
// Template-based, sem APIs externas.

export interface SummaryInput {
  distanceKm: number;
  durationMinutes: number;
  avgPaceMinPerKm: number;
  bestSplitMinPerKm?: number;
  worstSplitMinPerKm?: number;
  calories?: number;
  elevationGainM?: number;
  sport?: string;
}

function formatPace(p?: number): string {
  if (!p || !isFinite(p)) return '--:--';
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function generateWorkoutSummary(input: SummaryInput): string {
  const sport = input.sport || 'corrida';
  const km = input.distanceKm.toFixed(2);
  const dur = Math.round(input.durationMinutes);
  const pace = formatPace(input.avgPaceMinPerKm);

  const parts: string[] = [];
  parts.push(`Você completou ${km} km de ${sport} em ${dur} min.`);
  parts.push(`Ritmo médio: ${pace}/km.`);

  if (input.bestSplitMinPerKm && input.bestSplitMinPerKm > 0) {
    parts.push(`Melhor split: ${formatPace(input.bestSplitMinPerKm)}.`);
  }
  if (input.calories && input.calories > 0) {
    parts.push(`Calorias estimadas: ${Math.round(input.calories)} kcal.`);
  }
  if (input.elevationGainM && input.elevationGainM > 0) {
    parts.push(`Subida acumulada: ${Math.round(input.elevationGainM)} m.`);
  }

  // Motivacional baseado em distância
  if (input.distanceKm >= 21) parts.push('Treino épico! Você está prontíssimo pra maratona. 🔥');
  else if (input.distanceKm >= 10) parts.push('Long run de respeito! 💪');
  else if (input.distanceKm >= 5) parts.push('Sessão consistente, parabéns! 👏');
  else parts.push('Cada metro conta. Bora pra próxima! 🚀');

  return parts.join(' ');
}

/** Compara com o histórico para feedback comparativo. */
export function compareWithHistory(
  current: SummaryInput,
  history: { avgDistanceKm: number; avgPace: number },
): string | null {
  if (!history || !history.avgDistanceKm) return null;
  const lines: string[] = [];
  const distDelta = ((current.distanceKm - history.avgDistanceKm) / history.avgDistanceKm) * 100;
  if (distDelta > 15) lines.push(`Você correu ${distDelta.toFixed(0)}% a mais que sua média.`);
  else if (distDelta < -15) lines.push(`Treino mais curto que sua média habitual.`);

  if (history.avgPace && current.avgPaceMinPerKm) {
    const paceDelta = current.avgPaceMinPerKm - history.avgPace;
    if (paceDelta < -0.2) lines.push(`Pace ${Math.abs(paceDelta * 60).toFixed(0)}s mais rápido que sua média. 🚀`);
    else if (paceDelta > 0.3) lines.push(`Ritmo mais leve hoje — recovery run? 😉`);
  }
  return lines.length ? lines.join(' ') : null;
}
