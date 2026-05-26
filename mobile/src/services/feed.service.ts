import api from './api';

export interface FeedPost {
  id: string;
  user_id: string;
  user: { id: string; name: string; avatarUrl?: string };
  activity_id?: string | null;
  caption?: string | null;
  photoUrl?: string | null;
  distanceKm: number;
  durationSeconds: number;
  avgPace: number;
  calories: number;
  sport?: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  user: { id: string; name: string; avatarUrl?: string };
  text: string;
  createdAt: string;
}

export const feedApi = {
  list: (page = 1) => api.get<FeedPost[]>('/feed', { params: { page } }).then((r) => r.data),
  byUser: (userId: string, page = 1) =>
    api.get<FeedPost[]>(`/feed/user/${userId}`, { params: { page } }).then((r) => r.data),
  publish: (body: {
    activityId?: string;
    caption?: string;
    photoUrl?: string;
    distanceKm?: number;
    durationSeconds?: number;
    avgPace?: number;
    calories?: number;
    sport?: string;
  }) => api.post<FeedPost>('/feed', body).then((r) => r.data),
  like: (postId: string) => api.post(`/feed/${postId}/like`).then((r) => r.data),
  unlike: (postId: string) => api.delete(`/feed/${postId}/like`).then((r) => r.data),
  remove: (postId: string) => api.delete(`/feed/${postId}`).then((r) => r.data),
  getComments: (postId: string, page = 1) =>
    api.get<FeedComment[]>(`/feed/${postId}/comments`, { params: { page } }).then((r) => r.data),
  addComment: (postId: string, text: string) =>
    api.post<FeedComment>(`/feed/${postId}/comments`, { text }).then((r) => r.data),
  deleteComment: (postId: string, commentId: string) =>
    api.delete(`/feed/${postId}/comments/${commentId}`).then((r) => r.data),
};
