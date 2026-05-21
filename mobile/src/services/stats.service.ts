import api from './api';
import { UserStats } from '../types';

export const statsService = {
  getUserStats: async (): Promise<UserStats> => {
    const response = await api.get('/stats');
    return response.data;
  },

  getWeeklyStats: async (): Promise<any> => {
    const response = await api.get('/stats/weekly');
    return response.data;
  },
};
