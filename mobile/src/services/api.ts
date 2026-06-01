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

// Interceptor: adiciona token JWT em todas as requisições.
// SECURITY: lê APENAS do SecureStore (Keychain/EncryptedSharedPreferences).
// Em web, secureStorage usa um wrapper sobre localStorage com prefixo.
api.interceptors.request.use(async (config) => {
  const token = await secureStorage.getItem('@sync:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Migração: se ainda houver token em AsyncStorage (legacy), move pro SecureStore e remove
  if (!token) {
    const legacy = await AsyncStorage.getItem('@sync:token').catch(() => null);
    if (legacy) {
      await secureStorage.setItem('@sync:token', legacy).catch(() => {});
      await AsyncStorage.removeItem('@sync:token').catch(() => {});
      config.headers.Authorization = `Bearer ${legacy}`;
    }
  }
  return config;
});

// Interceptor: trata erros globalmente.
// IMPORTANTE: só limpamos a sessão quando o 401 vem da validação de sessão
// (/users/me ou /auth/*). Um 401 de um recurso isolado (upload, feed, etc.)
// NÃO deve deslogar o usuário de tudo — antes, um único upload com falha
// derrubava a sessão inteira.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url: string = error.config?.url || '';
    const isSessionCheck = url.includes('/users/me') || url.includes('/auth/');
    if (error.response?.status === 401 && isSessionCheck) {
      await secureStorage.removeItem('@sync:token');
      await AsyncStorage.removeItem('@sync:token').catch(() => {});
      await AsyncStorage.removeItem('@sync:user').catch(() => {});
    }
    return Promise.reject(error);
  },
);

export default api;
