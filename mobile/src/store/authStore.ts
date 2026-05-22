import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setAuth: (user: User, token: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const data = await authService.login(email, password);
    // saveAuth já foi chamado dentro do authService — token está no SecureStore
    set({ user: data.user, token: data.accessToken, isAuthenticated: true, isLoading: false });
  },

  register: async (name, email, password, confirmPassword) => {
    const data = await authService.register(name, email, password, confirmPassword);
    // Garante que o user tenha o flag onboardingCompleted (mesmo que false)
    const user = { ...data.user, onboardingCompleted: data.user?.onboardingCompleted ?? false };
    set({ user, token: data.accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const stored = await authService.getStoredUser();
      if (stored) {
        set({
          user: stored.user,
          token: stored.token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),

  setAuth: async (user, token) => {
    await authService.saveAuth({ user, accessToken: token });
    set({ user, token, isAuthenticated: true });
  },
}));
