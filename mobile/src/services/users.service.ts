import api from './api';
import { User } from '../types';

export const usersService = {
  search: async (query: string, page = 1, limit = 20): Promise<User[]> => {
    const response = await api.get(`/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    return response.data;
  },

  blockUser: async (userId: string): Promise<void> => {
    await api.post(`/users/${userId}/block`);
  },

  unblockUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}/block`);
  },

  getBlockedUsers: async (): Promise<User[]> => {
    const response = await api.get('/users/blocked');
    return response.data;
  },

  reportUser: async (userId: string, reason: string, description?: string): Promise<void> => {
    await api.post(`/users/${userId}/report`, { reason, description });
  },
};
