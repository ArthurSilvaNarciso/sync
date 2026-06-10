// Banner global de "sem conexão". No web usa navigator.onLine + eventos
// online/offline (confiável e grátis). No nativo renderiza null (evita
// detecção meia-boca sem uma lib dedicada).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConnectionBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => {
      const isOff = typeof navigator !== 'undefined' && navigator.onLine === false;
      setOffline(isOff);
      if (isOff) AccessibilityInfo.announceForAccessibility?.('Sem conexão com a internet');
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <View
      style={[styles.banner, { paddingTop: Math.max(insets.top, 6) + 6 }]}
      accessibilityRole="alert"
      accessibilityLabel="Sem conexão com a internet"
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>Sem conexão — algumas coisas podem não funcionar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    backgroundColor: '#B91C1C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
