// Auto-pause: detecta quando usuário parou de se mover por >= 5s e sugere pausar.
// Usa janela rolante de pontos GPS e calcula velocidade.

export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: number; // ms
  speed?: number; // m/s, se disponível do dispositivo
}

const STOP_SPEED_MS = 0.5; // < 0.5 m/s = parado (1.8 km/h)
const STOP_WINDOW_MS = 5000; // 5 seg parado dispara pause
const RESUME_SPEED_MS = 1.5; // > 1.5 m/s = movendo de novo (5.4 km/h)

export class AutoPauseDetector {
  private points: GpsPoint[] = [];
  private isPaused = false;
  private stopStartedAt: number | null = null;

  /** Adiciona ponto. Retorna ação se houve mudança ('pause' | 'resume' | null). */
  push(point: GpsPoint): 'pause' | 'resume' | null {
    this.points.push(point);
    // Mantém só últimos 30s
    const cutoff = point.timestamp - 30000;
    this.points = this.points.filter((p) => p.timestamp >= cutoff);

    const speed = this.currentSpeed();
    if (speed === null) return null;

    if (!this.isPaused) {
      if (speed < STOP_SPEED_MS) {
        if (this.stopStartedAt === null) {
          this.stopStartedAt = point.timestamp;
        } else if (point.timestamp - this.stopStartedAt >= STOP_WINDOW_MS) {
          this.isPaused = true;
          this.stopStartedAt = null;
          return 'pause';
        }
      } else {
        this.stopStartedAt = null;
      }
    } else {
      if (speed > RESUME_SPEED_MS) {
        this.isPaused = false;
        return 'resume';
      }
    }
    return null;
  }

  /** Velocidade média dos últimos 5s em m/s. */
  currentSpeed(): number | null {
    if (this.points.length < 2) return null;
    const last = this.points[this.points.length - 1];
    const fiveSecAgo = last.timestamp - 5000;
    const window = this.points.filter((p) => p.timestamp >= fiveSecAgo);
    if (window.length < 2) return null;
    // Distância total acumulada na janela
    let dist = 0;
    for (let i = 1; i < window.length; i++) {
      dist += haversine(window[i - 1], window[i]);
    }
    const dt = (last.timestamp - window[0].timestamp) / 1000;
    return dt > 0 ? dist / dt : null;
  }

  reset() {
    this.points = [];
    this.isPaused = false;
    this.stopStartedAt = null;
  }

  paused() { return this.isPaused; }
}

function haversine(a: GpsPoint, b: GpsPoint): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
