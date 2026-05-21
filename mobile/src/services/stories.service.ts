import api from './api';

export interface Story {
  id: string;
  user_id: string;
  user?: { id: string; name: string; avatarUrl?: string };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string | null;
  sport: string | null;
  distanceKm: number | null;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  expiresAt: string;
}

export const storiesService = {
  async create(formData: FormData): Promise<Story> {
    const { data } = await api.post('/stories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (d) => d,
    });
    return data;
  },

  async feed(page = 1, limit = 30): Promise<{ stories: Story[]; total: number }> {
    const { data } = await api.get('/stories', { params: { page, limit } });
    return data;
  },

  async byUser(userId: string): Promise<Story[]> {
    const { data } = await api.get(`/stories/user/${userId}`);
    return data;
  },

  async view(storyId: string): Promise<void> {
    await api.post(`/stories/${storyId}/view`);
  },

  async like(storyId: string): Promise<{ likeCount: number }> {
    const { data } = await api.post(`/stories/${storyId}/like`);
    return data;
  },

  async delete(storyId: string): Promise<void> {
    await api.delete(`/stories/${storyId}`);
  },
};
