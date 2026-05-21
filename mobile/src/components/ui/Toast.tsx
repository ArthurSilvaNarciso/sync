// Toast global — substitui Alert.alert para mensagens não-críticas.
// Uso: showToast('Mensagem', 'success' | 'error' | 'info')
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, View, Platform, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; kind: ToastKind };

let pushFn: ((msg: string, kind?: ToastKind) => void) | null = null;

export function showToast(message: string, kind: ToastKind = 'info') {
  pushFn?.(message, kind);
}

const COLORS = {
  success: { bg: ['#0F3D2E', '#0A2A20'], accent: '#4ADE80', icon: 'checkmark-circle' as const },
  error: { bg: ['#3D1010', '#2A0808'], accent: '#F87171', icon: 'alert-circle' as const },
  info: { bg: ['#1A1A2E', '#0F0F1E'], accent: '#FF6B35', icon: 'information-circle' as const },
};

function ToastBubble({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const slide = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const cfg = COLORS[item.kind];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slide, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubble,
        { transform: [{ translateY: slide }], opacity, borderColor: cfg.accent + '60' },
      ]}
    >
      <LinearGradient
        colors={cfg.bg as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bubbleBg}
      >
        <Ionicons name={cfg.icon} size={20} color={cfg.accent} />
        <Text style={styles.bubbleText} numberOfLines={3}>
          {item.message}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, kind }]);
  }, []);

  useEffect(() => {
    pushFn = push;
    return () => {
      if (pushFn === push) pushFn = null;
    };
  }, [push]);

  return (
    <View style={styles.host} pointerEvents="none">
      {items.map((item) => (
        <ToastBubble
          key={item.id}
          item={item}
          onDone={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    gap: 8,
  },
  bubble: {
    width: '92%',
    maxWidth: 440,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  bubbleBg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bubbleText: {
    flex: 1,
    color: '#F0F0FF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
});
