import api from './api';

export interface LikeReceivedItem {
  likeId: string;
  createdAt: string;
  isSuperLike: boolean;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    level?: string | null;
    sports?: string[] | null;
    bio?: string | null;
  };
}

export const matchingApi = {
  likesReceived: () =>
    api.get<LikeReceivedItem[]>('/matching/likes-received').then((r) => r.data),

  likesReceivedCount: () =>
    api
      .get<{ count: number }>('/matching/likes-received/count')
      .then((r) => r.data.count),

  swipe: (toUserId: string, action: 'like' | 'super_like' | 'pass') =>
    api
      .post<{ matched: boolean; matchId?: string }>('/matching/swipe', { toUserId, action })
      .then((r) => r.data),
};
