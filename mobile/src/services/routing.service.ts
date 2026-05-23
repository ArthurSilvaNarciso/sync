// Route planner usando OSRM (Open Source Routing Machine) — público, free
// Calcula rota A→B pra foot, bike ou car

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

export type RouteProfile = 'foot' | 'bike' | 'driving';

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
  /** caloria estimada por esporte */
  caloriesEstimate: {
    running: number;
    cycling: number;
    walking: number;
  };
}

// MET values (intensidade metabólica)
const MET_VALUES = {
  walking: 3.5,
  running: 9.8,
  cycling: 7.5,
};

const DEFAULT_WEIGHT = 70; // kg

function caloriesFor(met: number, durationSec: number, weightKg = DEFAULT_WEIGHT): number {
  return Math.round((met * weightKg * durationSec) / 3600);
}

export async function planRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  profile: RouteProfile = 'foot',
): Promise<RouteResult | null> {
  const url = `${OSRM_BASE}/${profile}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const coords: Array<{ latitude: number; longitude: number }> = (
      route.geometry?.coordinates || []
    ).map((c: [number, number]) => ({ longitude: c[0], latitude: c[1] }));

    const distanceMeters = route.distance;
    const durationSeconds = route.duration;

    // Para cada esporte, recalcula a duração realisticamente
    // Walking ~5 km/h, Running ~10 km/h, Cycling ~20 km/h
    const distKm = distanceMeters / 1000;
    const speedKmh = { walking: 5, running: 10, cycling: 20 };
    const durations = {
      walking: (distKm / speedKmh.walking) * 3600,
      running: (distKm / speedKmh.running) * 3600,
      cycling: (distKm / speedKmh.cycling) * 3600,
    };

    return {
      distanceMeters,
      durationSeconds,
      coordinates: coords,
      caloriesEstimate: {
        walking: caloriesFor(MET_VALUES.walking, durations.walking),
        running: caloriesFor(MET_VALUES.running, durations.running),
        cycling: caloriesFor(MET_VALUES.cycling, durations.cycling),
      },
    };
  } catch {
    return null;
  }
}

/** Tempo estimado por esporte. */
export function estimateTime(distanceMeters: number, sport: 'walking' | 'running' | 'cycling'): number {
  const speedKmh = { walking: 5, running: 10, cycling: 20 }[sport];
  return (distanceMeters / 1000 / speedKmh) * 3600;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}
