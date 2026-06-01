/**
 * useSafeArea — hook centralizado para insets de área segura.
 *
 * Elimina os valores hardcoded (Platform.OS === 'ios' ? 56 : 44) espalhados
 * por toda a codebase e garante suporte correto para:
 *   - iPhones com Dynamic Island (topo ~59px)
 *   - iPhones com notch (topo 44px)
 *   - iPhones clássicos (topo 20px)
 *   - Android com gestures (bottom 0px) vs botões (bottom 0px)
 *   - Indicador home do iPhone (bottom 34px)
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

// Altura da tab bar customizada (exportada para uso em contentContainerStyle)
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 64;

export function useSafeArea() {
  const insets = useSafeAreaInsets();

  return {
    // Padding do topo (status bar / Dynamic Island / notch)
    top: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24),

    // Padding do fundo (indicador home do iPhone / barra de gestos Android)
    bottom: insets.bottom,

    // Padding total para listas scrolláveis (evita conteúdo atrás da tab bar)
    listBottom: TAB_BAR_HEIGHT + insets.bottom,

    // Insets brutos para layouts que precisam de controle fino
    raw: insets,
  };
}
