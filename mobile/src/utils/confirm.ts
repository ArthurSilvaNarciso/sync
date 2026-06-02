import { Alert, Platform } from 'react-native';

/**
 * Confirmação cross-platform. No React Native Web o `Alert.alert` com botões
 * é um no-op (vira window.alert e ignora os callbacks), então confirmações de
 * logout/apagar conta/etc. "não faziam nada". Aqui usamos window.confirm no web
 * e Alert.alert no native.
 *
 * Retorna uma Promise<boolean> (true = confirmou).
 */
export function confirmAsync(
  title: string,
  message?: string,
  options?: { confirmText?: string; cancelText?: string; destructive?: boolean },
): Promise<boolean> {
  const confirmText = options?.confirmText || 'Confirmar';
  const cancelText = options?.cancelText || 'Cancelar';

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    const ok = typeof window !== 'undefined' ? window.confirm(text) : false;
    return Promise.resolve(ok);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: options?.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
