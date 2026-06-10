import { useAccessibilityStore } from '../store/accessibilityStore';

/**
 * Retorna true quando o usuário pediu pra reduzir/desligar animações
 * (preferência do app, já sincronizada com a config do sistema operacional
 * em AccessibilityEffects). Componentes usam pra pular animações pesadas.
 */
export function useReduceMotion(): boolean {
  return useAccessibilityStore((s) => s.reduceMotion);
}
