import api from './api';

export interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  sport?: string | null;
  city?: string | null;
  isPrivate: boolean;
  inviteCode?: string | null;
  memberCount: number;
  totalDistanceKm: number;
  totalActivities: number;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  admin_id: string;
  createdAt: string;
}

export interface GroupMemberRanking {
  id: string;
  user: { id: string; name: string; avatarUrl?: string };
  role: 'admin' | 'member';
  contributedKm: number;
  contributedActivities: number;
}

export const groupsApi = {
  listPublic: (params?: { city?: string; sport?: string; page?: number }) =>
    api.get<GroupSummary[]>('/groups/public', { params }).then((r) => r.data),
  ranking: (params?: { city?: string; sport?: string }) =>
    api.get<(GroupSummary & { position: number })[]>('/groups/ranking', { params }).then((r) => r.data),
  myGroups: () => api.get<GroupSummary[]>('/groups/me').then((r) => r.data),
  detail: (id: string) => api.get<GroupSummary>(`/groups/${id}`).then((r) => r.data),
  members: (id: string) => api.get<GroupMemberRanking[]>(`/groups/${id}/members`).then((r) => r.data),
  create: (body: { name: string; description?: string; sport?: string; city?: string; isPrivate?: boolean }) =>
    api.post<GroupSummary>('/groups', body).then((r) => r.data),
  join: (id: string, inviteCode?: string) =>
    api.post(`/groups/${id}/join`, { inviteCode }).then((r) => r.data),
  leave: (id: string) => api.post(`/groups/${id}/leave`).then((r) => r.data),
  remove: (id: string) => api.delete(`/groups/${id}`).then((r) => r.data),
};
