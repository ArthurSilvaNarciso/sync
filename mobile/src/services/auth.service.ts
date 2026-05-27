import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secure-storage';
import { AuthResponse, User, SportLevel } from '../types';

function generateSecureId(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Demo user somente para modo demo explícito (botão "Entrar no modo demo")
const DEMO_USER: User = {
  id: 'demo-user-001',
  name: 'Usuario Demo',
  email: 'demo@sync-app.com',
  bio: 'Apaixonado por esportes e vida saudavel! Sempre buscando novos parceiros de treino.',
  avatarUrl: '',
  sports: ['running', 'cycling', 'gym'],
  level: SportLevel.INTERMEDIATE,
  objectives: ['health', 'social'],
  availability: ['morning', 'evening'],
  latitude: -23.5505,
  longitude: -46.6333,
  city: 'Sao Paulo, SP',
  isActive: true,
  onboardingCompleted: true,
  createdAt: new Date().toISOString(),
};

export const authService = {
  async register(
    name: string, email: string, password: string, confirmPassword: string,
    extra?: { weightKg?: number; heightCm?: number; gender?: string },
  ): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register', { name, email, password, confirmPassword, ...extra });
    await this.saveAuth(data);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', { email, password });
    await this.saveAuth(data);
    return data;
  },

  async loginDemo(): Promise<AuthResponse> {
    const demoData: AuthResponse = {
      user: { ...DEMO_USER },
      accessToken: `demo-${generateSecureId()}`,
    };
    await this.saveAuth(demoData);
    return demoData;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, newPassword });
  },

  async logout(): Promise<void> {
    // Token vai pro SecureStore (criptografado)
    await secureStorage.removeItem('@sync:token');
    // Compat: limpa AsyncStorage caso tenha legacy
    await AsyncStorage.removeItem('@sync:token').catch(() => {});
    await AsyncStorage.removeItem('@sync:user').catch(() => {});
  },

  async saveAuth(data: AuthResponse): Promise<void> {
    // Token sensível → SecureStore. User não-sensível → AsyncStorage.
    await secureStorage.setItem('@sync:token', data.accessToken);
    await AsyncStorage.setItem('@sync:user', JSON.stringify(data.user));
  },

  async getStoredUser() {
    const userStr = await AsyncStorage.getItem('@sync:user');
    let token = await secureStorage.getItem('@sync:token');
    // Fallback: migra de AsyncStorage se token antigo existir
    if (!token) {
      const legacy = await AsyncStorage.getItem('@sync:token').catch(() => null);
      if (legacy) {
        await secureStorage.setItem('@sync:token', legacy);
        await AsyncStorage.removeItem('@sync:token').catch(() => {});
        token = legacy;
      }
    }
    if (userStr && token) {
      return { user: JSON.parse(userStr), token };
    }
    return null;
  },
};
