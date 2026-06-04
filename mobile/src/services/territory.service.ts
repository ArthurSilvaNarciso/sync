import api from './api';

export interface TerritoryCell {
  cellId: string;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  lat: number;
  lng: number;
  claimCount: number;
}

export interface TerritoryLeader {
  position: number;
  userId: string;
  name: string;
  color: string;
  cells: number;
}

export interface TerritoryMe {
  cells: number;
  position: number | null;
  color: string;
}

export const territoryApi = {
  /** Conquista células pela rota percorrida (lista de pontos lat/lng). */
  claim: (points: { lat: number; lng: number }[]) =>
    api.post<{ claimed: number; stolen: number; totalOwned: number }>('/territory/claim', { points })
      .then((r) => r.data),

  cells: (bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }) =>
    api.get<TerritoryCell[]>('/territory/cells', { params: bbox }).then((r) => r.data),

  leaderboard: () =>
    api.get<TerritoryLeader[]>('/territory/leaderboard').then((r) => r.data),

  me: () => api.get<TerritoryMe>('/territory/me').then((r) => r.data),
};
