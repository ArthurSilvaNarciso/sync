import api from './api';
import { Achievement, UserXP } from '../types';

export const achievementsService = {
  getAchievements: async (): Promise<Achievement[]> => {
    const response = await api.get('/achievements');
    return response.data;
  },

  checkNewAchievements: async (): Promise<Achievement[]> => {
    const response = await api.get('/achievements/check');
    return response.data;
  },

  getXP: async (): Promise<UserXP> => {
    const response = await api.get('/achievements/xp');
    return response.data;
  },
};
