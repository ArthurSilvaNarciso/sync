import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';

interface Props {
  days: number;
  onPress?: () => void;
  compact?: boolean;
}

/**
 * Badge da streak (sequência de dias treinando).
 * Anima sutilmente em loop pra chamar atenção.
 */
export default function StreakBadge({ days, onPress, compact }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (days < 1) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [days, pulse]);

  const fire = days >= 7 ? '🔥' : days >= 3 ? '⚡' : '✨';
  const color = days >= 7 ? '#FF6B35' : days >= 3 ? '#F59E0B' : '#9CA3AF';

  const inner = (
    <Animated.View style={[styles.box, compact && styles.boxCompact, { transform: [{ scale: pulse }], borderColor: color }]}>
      <Text style={styles.emoji}>{fire}</Text>
      <Text style={[styles.days, { color }]}>{days}</Text>
      {!compact && <Text style={styles.label}>{days === 1 ? 'dia' : 'dias'}</Text>}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderRadius: 999,
    borderWidth: 1,
  },
  boxCompact: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 4,
  },
  emoji: { fontSize: 16 },
  days: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 11,
    color: '#8E8EA0',
    fontWeight: '600',
  },
});
