import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { secureStorage } from './secure-storage';

// URL do backend de produção (Railway). É o DEFAULT quando não há env var,
// pra garantir que o app funcione em qualquer lugar (deploy, celular, preview)
// sem depender de configuração extra.
const PROD_API = 'https://sync-production-4830.up.railway.app';

// Ordem de resolução da base da API:
// 1. EXPO_PUBLIC_API_URL (injetada no build) — sobrepõe tudo.
// 2. Dev local explícito: web em localhost:8081 OU nativo em dev → localhost:3000.
// 3. Qualquer outro caso (deploy web, celular, preview) → produção (Railway).
const getApiBase = () => {
  const env = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (env) return env.replace(/\/$/, '') + '/api';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Só usa backend local quando explicitamente rodando backend em localhost.
    // (o preview Expo Web roda em localhost mas NÃO tem backend local, então
    //  apontamos pra produção pra funcionar de imediato.)
    if (host === '127.0.0.1') {
      return `${window.location.protocol}//${host}:3000/api`;
    }
    return PROD_API + '/api';
  }
  // Nativo sem env var → produção (antes caía em localhost:3000 e falhava no
  // celular, pois localhost no device é o próprio aparelho).
  return PROD_API + '/api';
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

// Callback registrado pelo authStore — disparado quando a sessão expira, pra
// mandar o usuário de volta ao login (em vez de deixá-lo preso numa tela
// fazendo chamadas que sempre falham). Evita import circular (api ↔ store).
let sessionExpiredHandler: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) {
  sessionExpiredHandler = fn;
}

// Interceptor: trata erros globalmente.
// IMPORTANTE: só limpamos a sessão quando o 401 vem da validação de sessão
// (/users/me ou /auth/*). Um 401 de um recurso isolado (upload, feed, etc.)
// NÃO deve deslogar o usuário de tudo — antes, um único upload com falha
// derrubava a sessão inteira.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config: any = error.config || {};
    const url: string = config.url || '';

    // Cold start do Railway (free tier dorme): a 1ª request demora a responder
    // e estoura timeout/erro de rede. Tenta UMA vez de novo em GET idempotente
    // — assim o app não mostra "erro" só porque o backend estava acordando.
    const isNetworkOrTimeout = !error.response; // timeout ECONNABORTED ou rede
    const isGet = (config.method || 'get').toLowerCase() === 'get';
    if (isNetworkOrTimeout && isGet && !config._retried) {
      config._retried = true;
      await new Promise((r) => setTimeout(r, 1500));
      return api(config);
    }

    const isSessionCheck = url.includes('/users/me') || url.includes('/auth/');
    if (error.response?.status === 401 && isSessionCheck) {
      await secureStorage.removeItem('@sync:token');
      await AsyncStorage.removeItem('@sync:token').catch(() => {});
      await AsyncStorage.removeItem('@sync:user').catch(() => {});
      // Atualiza o estado em memória → RootNavigator volta pro login
      sessionExpiredHandler?.();
    }
    return Promise.reject(error);
  },
);

export default api;
