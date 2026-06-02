// Calcula splits por quilômetro (estilo Strava / Adidas Running) a partir dos
// pontos GPS de uma atividade. Cada split tem o pace (min/km) daquele km.

export interface SplitPoint {
  latitude: number;
  longitude: number;
  timestamp?: string | number | Date | null;
  altitude?: number | null;
}

export interface Split {
  km: number;            // 1, 2, 3...  (último pode ser parcial)
  distanceKm: number;    // distância real do split (1.0, ou <1 no último)
  durationSec: number;   // tempo gasto nesse km
  paceMinPerKm: number;  // min/km
  isFastest: boolean;
}

const R = 6371000; // raio da Terra (m)
function haversine(a: SplitPoint, b: SplitPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function ts(p: SplitPoint): number {
  if (p.timestamp == null) return 0;
  const t = new Date(p.timestamp as any).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Retorna a lista de splits por km. Precisa de pontos com timestamp.
 * Se não houver pontos/tempo suficientes, retorna [].
 */
export function computeSplits(points?: SplitPoint[] | null): Split[] {
  if (!points || points.length < 2) return [];
  // Filtra pontos com timestamp válido
  const pts = points.filter((p) => ts(p) > 0 && isFinite(p.latitude) && isFinite(p.longitude));
  if (pts.length < 2) return [];

  const splits: Split[] = [];
  let kmIndex = 1;
  let accDist = 0;        // distância acumulada no km atual (m)
  let kmStartTime = ts(pts[0]);

  for (let i = 1; i < pts.length; i++) {
    const seg = haversine(pts[i - 1], pts[i]);
    if (!isFinite(seg) || seg <= 0) continue;
    accDist += seg;

    if (accDist >= 1000) {
      const endTime = ts(pts[i]);
      const durationSec = Math.max(1, (endTime - kmStartTime) / 1000);
      splits.push({
        km: kmIndex,
        distanceKm: 1,
        durationSec,
        paceMinPerKm: durationSec / 60, // 1km → min = min/km
        isFastest: false,
      });
      kmIndex++;
      accDist -= 1000;
      kmStartTime = endTime;
    }
  }

  // Último km parcial (>= 100m pra valer a pena mostrar)
  if (accDist >= 100) {
    const endTime = ts(pts[pts.length - 1]);
    const durationSec = Math.max(1, (endTime - kmStartTime) / 1000);
    const distanceKm = accDist / 1000;
    splits.push({
      km: kmIndex,
      distanceKm,
      durationSec,
      paceMinPerKm: durationSec / 60 / distanceKm,
      isFastest: false,
    });
  }

  // Marca o km cheio mais rápido (ignora o parcial pra ser justo)
  const fullSplits = splits.filter((s) => s.distanceKm >= 0.999);
  if (fullSplits.length > 0) {
    let best = fullSplits[0];
    for (const s of fullSplits) if (s.paceMinPerKm < best.paceMinPerKm) best = s;
    best.isFastest = true;
  }

  return splits;
}

/** Formata pace decimal (min/km) como m:ss */
export function formatPace(paceMinPerKm: number): string {
  if (!isFinite(paceMinPerKm) || paceMinPerKm <= 0) return '--';
  const min = Math.floor(paceMinPerKm);
  const sec = Math.round((paceMinPerKm - min) * 60);
  if (sec === 60) return `${min + 1}:00`;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
