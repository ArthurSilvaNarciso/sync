import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Banner global que desce do topo quando perde conexão e some quando volta.
 * Renderize no topo do RootNavigator (depois do header).
 */
export default function NetworkBanner() {
  const { online } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-60)).current;
  const showed = useRef(false);

  useEffect(() => {
    if (!online) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
      showed.current = true;
    } else if (showed.current) {
      // Mostra "Voltou" rapidamente, depois esconde
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start(() => {
        setTimeout(() => {
          Animated.timing(translateY, { toValue: -60, duration: 200, useNativeDriver: true }).start();
        }, 1400);
      });
    }
  }, [online, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], backgroundColor: online ? '#10B981' : '#EF4444' },
      ]}
      pointerEvents="none"
    >
      <View style={styles.row}>
        <Ionicons
          name={online ? 'cloud-done-outline' : 'cloud-offline-outline'}
          size={16}
          color="#fff"
        />
        <Text style={styles.text}>{online ? 'De volta online' : 'Sem internet · modo offline'}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
