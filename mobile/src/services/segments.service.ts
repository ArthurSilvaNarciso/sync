// Segments estilo Strava — trechos com leaderboard (KOM/QOM).
import api from './api';

export type Segment = {
  id: string;
  name: string;
  description?: string | null;
  distanceMeters: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  city?: string | null;
  sport: string;
  attemptsCount: number;
  bestTimeSec?: number | null;
  bestUserId?: string | null;
  creator?: { id: string; name: string; avatarUrl?: string | null } | null;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  city?: string | null;
  level?: string | null;
  elapsedSec: number;
  tries: number;
  isKOM: boolean;
};

export const segmentsApi = {
  nearby: (lat: number, lng: number, radiusKm = 10): Promise<Segment[]> =>
    api
      .get('/segments/nearby', { params: { lat, lng, radiusKm } })
      .then((r) => r.data || []),

  detail: (id: string): Promise<Segment | null> =>
    api.get(`/segments/${id}`).then((r) => r.data),

  leaderboard: (id: string): Promise<LeaderboardRow[]> =>
    api.get(`/segments/${id}/leaderboard`).then((r) => r.data || []),

  leaderboardFriends: (id: string): Promise<LeaderboardRow[]> =>
    api.get(`/segments/${id}/leaderboard/friends`).then((r) => r.data || []),

  myKoms: (): Promise<{ count: number }> =>
    api.get('/segments/me/koms').then((r) => r.data || { count: 0 }),

  recordEffort: (
    id: string,
    elapsedSec: number,
    activityId?: string,
  ): Promise<{ ok: boolean; isPR: boolean; isKOM: boolean; elapsedSec: number; myPrevBest: number | null }> =>
    api.post(`/segments/${id}/effort`, { elapsedSec, activityId }).then((r) => r.data),

  create: (body: {
    name: string;
    description?: string;
    distanceMeters: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    city?: string;
    sport?: string;
  }): Promise<Segment> => api.post('/segments', body).then((r) => r.data),
};

// Formata segundos como mm:ss ou h:mm:ss
export function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}`;
}
