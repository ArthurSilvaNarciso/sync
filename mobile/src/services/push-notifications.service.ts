// Registra push token do device + handlers de notificação
import { Platform } from 'react-native';
import api from './api';

let cachedToken: string | null = null;

export async function registerForPushNotifications(): Promise<string | null> {
  // No web: usa Notification API + service worker
  if (Platform.OS === 'web') {
    return registerWebPush();
  }

  // Native: usa expo-notifications
  try {
    // Import dinâmico (módulos podem não estar disponíveis no web)
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    if (!Device.default.isDevice) {
      console.log('[push] Não é device físico — skip');
      return null;
    }

    // status/granted vêm de PermissionResponse; cast defensivo pois o import
    // dinâmico nem sempre resolve a interface herdada de expo-modules-core
    const existing = (await Notifications.getPermissionsAsync()) as { status: string; granted?: boolean };
    let finalStatus = existing.status;
    if (finalStatus !== 'granted') {
      const requested = (await Notifications.requestPermissionsAsync()) as { status: string; granted?: boolean };
      finalStatus = requested.status;
    }
    if (finalStatus !== 'granted') {
      console.log('[push] Permissão negada');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,                                // pode ser undefined em dev
    } as any);
    const token = tokenData.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }

    if (token && token !== cachedToken) {
      cachedToken = token;
      await api.post('/notifications/push-token', {
        token,
        platform: Platform.OS,
        deviceName: Device.default.deviceName,
      }).catch(() => {});
    }

    return token;
  } catch (err) {
    console.warn('[push] register failed:', err);
    return null;
  }
}

async function registerWebPush(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return null;
    // Web push verdadeiro requer VAPID keys + push subscription
    // Por enquanto só pedimos permissão pra mostrar notifications locais via SW
    return 'web-local';
  } catch {
    return null;
  }
}

export function getCachedPushToken() {
  return cachedToken;
}

export async function unregisterPushToken() {
  if (!cachedToken) return;
  try {
    await api.delete('/notifications/push-token', { data: { token: cachedToken } });
  } catch {}
  cachedToken = null;
}
