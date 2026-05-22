// Zonas de pace baseadas em % do pace de limiar do usuário.
// Fórmula simplificada: usa pace médio dos últimos 30 dias como proxy de LT pace.
// Z1 = recuperação (≥125% LT pace) | Z2 = aeróbico (115-125%) | Z3 = forte (105-115%)
// Z4 = limiar (95-105%) | Z5 = VO2 max (<95%)

export type PaceZone = 1 | 2 | 3 | 4 | 5;

export interface PaceZones {
  ltPaceMinPerKm: number; // referência
  zones: Array<{ zone: PaceZone; minPace: number; maxPace: number; name: string; color: string }>;
}

export function computePaceZones(ltPaceMinPerKm: number): PaceZones {
  if (!ltPaceMinPerKm || ltPaceMinPerKm <= 0) {
    // default 6:00/km
    ltPaceMinPerKm = 6.0;
  }
  return {
    ltPaceMinPerKm,
    zones: [
      { zone: 1, minPace: ltPaceMinPerKm * 1.25, maxPace: 99,                     name: 'Recuperação', color: '#3B82F6' },
      { zone: 2, minPace: ltPaceMinPerKm * 1.15, maxPace: ltPaceMinPerKm * 1.25,  name: 'Aeróbico',    color: '#10B981' },
      { zone: 3, minPace: ltPaceMinPerKm * 1.05, maxPace: ltPaceMinPerKm * 1.15,  name: 'Forte',       color: '#F59E0B' },
      { zone: 4, minPace: ltPaceMinPerKm * 0.95, maxPace: ltPaceMinPerKm * 1.05,  name: 'Limiar',      color: '#EF4444' },
      { zone: 5, minPace: 0,                     maxPace: ltPaceMinPerKm * 0.95,  name: 'VO2 Max',     color: '#DC2626' },
    ],
  };
}

/** Retorna a zona atual baseada no pace em min/km. */
export function getCurrentZone(currentPaceMinPerKm: number, zones: PaceZones): PaceZone {
  if (!currentPaceMinPerKm || !isFinite(currentPaceMinPerKm)) return 1;
  for (const z of zones.zones) {
    if (currentPaceMinPerKm >= z.minPace && currentPaceMinPerKm < z.maxPace) return z.zone;
  }
  // mais rápido que Z5
  return 5;
}

export function paceToString(minPerKm: number): string {
  if (!minPerKm || !isFinite(minPerKm)) return '--:--';
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
