import api from './api';

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  challenger?: { id: string; name: string; avatarUrl?: string };
  challenged?: { id: string; name: string; avatarUrl?: string };
  sport: string;
  metric: 'distance' | 'pace' | 'duration';
  target: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
  winner_id: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const challengesService = {
  create: (body: {
    challengedId: string;
    sport: string;
    metric: 'distance' | 'pace' | 'duration';
    target: number;
    expiresInDays?: number;
  }) => api.post<Challenge>('/challenges', body).then((r) => r.data),

  list: () => api.get<Challenge[]>('/challenges').then((r) => r.data),

  respond: (id: string, accept: boolean) =>
    api.patch<Challenge>(`/challenges/${id}/respond`, { accept }).then((r) => r.data),

  complete: (id: string) =>
    api.patch<Challenge>(`/challenges/${id}/complete`).then((r) => r.data),
};
