import api from './api';
import { Weather, WeatherForecast, ExerciseRecommendation } from '../types';

export const weatherService = {
  getCurrentWeather: async (lat: number, lng: number): Promise<Weather> => {
    const response = await api.get(`/weather/current?lat=${lat}&lng=${lng}`);
    return response.data;
  },

  getForecast: async (lat: number, lng: number, days = 7): Promise<WeatherForecast[]> => {
    const response = await api.get(`/weather/forecast?lat=${lat}&lng=${lng}&days=${days}`);
    return response.data;
  },

  getRecommendation: async (lat: number, lng: number): Promise<ExerciseRecommendation> => {
    const response = await api.get(`/weather/recommendation?lat=${lat}&lng=${lng}`);
    return response.data;
  },
};
