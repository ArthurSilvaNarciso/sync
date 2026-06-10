import { Platform } from 'react-native';
import { hapticsAllowed } from '../store/accessibilityStore';

/**
 * Haptic feedback simples, cross-platform.
 *
 * - Native: usa expo-haptics se disponível
 * - Web: navigator.vibrate (Android Chrome) ou no-op
 * - Respeita a preferência de Acessibilidade (vibração on/off).
 *
 * Hook retorna funções nomeadas e idempotentes.
 */
export function useHaptic() {
  function tryNativeHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Haptics = require('expo-haptics');
      if (type === 'success') Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
      else if (type === 'warning') Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Warning);
      else if (type === 'error') Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Error);
      else if (type === 'light') Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'heavy') Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  }

  function tryWebHaptic(ms: number | number[]) {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { (navigator as any).vibrate(ms); } catch {}
    }
  }

  return {
    light: () => { if (!hapticsAllowed()) return; tryNativeHaptic('light'); tryWebHaptic(15); },
    medium: () => { if (!hapticsAllowed()) return; tryNativeHaptic('medium'); tryWebHaptic(30); },
    heavy: () => { if (!hapticsAllowed()) return; tryNativeHaptic('heavy'); tryWebHaptic(50); },
    success: () => { if (!hapticsAllowed()) return; tryNativeHaptic('success'); tryWebHaptic([20, 40, 20]); },
    warning: () => { if (!hapticsAllowed()) return; tryNativeHaptic('warning'); tryWebHaptic([30, 30]); },
    error: () => { if (!hapticsAllowed()) return; tryNativeHaptic('error'); tryWebHaptic([60, 40, 60]); },
  };
}
