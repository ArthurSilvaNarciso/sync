import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Detecta status online/offline.
 *
 * Em web usa navigator.onLine + eventos online/offline.
 * Em RN nativo: requer @react-native-community/netinfo (degrada pra true se ausente).
 */
export function useNetworkStatus(): { online: boolean; checking: boolean } {
  const [online, setOnline] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    if (Platform.OS === 'web') {
      const update = () => setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
      update();
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      setChecking(false);
      unsub = () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const NetInfo = require('@react-native-community/netinfo').default;
        const sub = NetInfo.addEventListener((state: any) => {
          setOnline(!!state.isConnected);
          setChecking(false);
        });
        unsub = sub;
      } catch {
        setOnline(true);
        setChecking(false);
      }
    }

    return () => unsub?.();
  }, []);

  return { online, checking };
}
