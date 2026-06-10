import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sync:accessibility';

export interface AccessibilityState {
  /** Aumenta o contraste de cores (web: filtro de contraste/brilho). */
  highContrast: boolean;
  /** Texto/UI maior (web: zoom do conteúdo). No nativo, respeita o tamanho do SO. */
  largeText: boolean;
  /** Reduz/desliga animações (útil pra sensibilidade a movimento / vestibular). */
  reduceMotion: boolean;
  /** Vibração de feedback (háptico). */
  hapticsEnabled: boolean;
  /** Narração por voz de eventos (treino, match) via síntese de voz. */
  audioCues: boolean;
  /** Widget VLibras (tradução para Língua Brasileira de Sinais) — só web. */
  libras: boolean;
  /** Já carregou as preferências salvas? */
  hydrated: boolean;

  set: (patch: Partial<AccessibilityState>) => void;
  toggle: (key: BoolKey) => void;
  hydrate: () => Promise<void>;
}

type BoolKey = 'highContrast' | 'largeText' | 'reduceMotion' | 'hapticsEnabled' | 'audioCues' | 'libras';

const DEFAULTS = {
  highContrast: false,
  largeText: false,
  reduceMotion: false,
  hapticsEnabled: true,
  audioCues: true,
  libras: false,
};

function persist(state: AccessibilityState) {
  const data = {
    highContrast: state.highContrast,
    largeText: state.largeText,
    reduceMotion: state.reduceMotion,
    hapticsEnabled: state.hapticsEnabled,
    audioCues: state.audioCues,
    libras: state.libras,
  };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  set: (patch) => {
    set(patch);
    persist(get());
  },

  toggle: (key) => {
    set({ [key]: !get()[key] } as any);
    persist(get());
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ ...DEFAULTS, ...parsed, hydrated: true });
        return;
      }
    } catch {
      // ignora — usa defaults
    }
    set({ hydrated: true });
  },
}));

/** Helper não-reativo: lê se o háptico está habilitado (usado no useHaptic). */
export function hapticsAllowed(): boolean {
  return useAccessibilityStore.getState().hapticsEnabled;
}

/** Helper não-reativo: lê se as pistas de áudio estão habilitadas. */
export function audioCuesAllowed(): boolean {
  return useAccessibilityStore.getState().audioCues;
}
