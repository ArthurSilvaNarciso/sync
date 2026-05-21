import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { secureStorage } from './secure-storage';

// Em produção (web build), usa env var injetada pelo Expo no build.
// Em dev no web, usa hostname atual + porta 3000.
// Em dev no native, usa o IP da máquina (LAN) ou localhost.
const getApiBase = () => {
  const env = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (env) return env.replace(/\/$/, '') + '/api';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
};

export const API_URL = getApiBase();
// Base sem o /api — usado por sockets e static (avatars)
export const API_HOST = API_URL.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adiciona token JWT em todas as requisições
api.interceptors.request.use(async (config) => {
  let token = await secureStorage.getItem('@sync:token');
  if (!token) {
    // Fallback compat: token legado em AsyncStorage
    token = await AsyncStorage.getItem('@sync:token').catch(() => null);
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: trata erros globalmente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await secureStorage.removeItem('@sync:token');
      await AsyncStorage.removeItem('@sync:token').catch(() => {});
      await AsyncStorage.removeItem('@sync:user').catch(() => {});
    }
    return Promise.reject(error);
  },
);

export default api;
