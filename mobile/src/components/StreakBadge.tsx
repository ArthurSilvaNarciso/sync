// Badge de streak (dias consecutivos com atividade) com animação de fogo.
// Cor escala conforme marco: 7 / 30 / 100 dias.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing, borderRadius } from '../theme';

type Tier = { color1: string; color2: string; label: string };

function tierFor(days: number): Tier {
  if (days >= 100) return { color1: '#FF1744', color2: '#7C0000', label: 'LENDÁRIO' };
  if (days >= 30) return { color1: '#FF6B35', color2: '#FF1744', label: 'EM CHAMAS' };
  if (days >= 7) return { color1: '#FFB13B', color2: '#FF6B35', label: 'ACESO' };
  if (days >= 1) return { color1: '#FF6B35', color2: '#FF8A5C', label: 'COMEÇANDO' };
  return { color1: '#3A3A50', color2: '#1E1E32', label: 'INATIVO' };
}

export default function StreakBadge({
  days,
  bestDays,
  compact = false,
}: {
  days: number;
  bestDays?: number;
  compact?: boolean;
}) {
  const tier = tierFor(days);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (days >= 1) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.12,
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
      ).start();
    }
  }, [days]);

  if (compact) {
    return (
      <View style={styles.compact}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ionicons name="flame" size={14} color={tier.color1} />
        </Animated.View>
        <Text style={[styles.compactText, { color: tier.color1 }]}>{days}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[tier.color1, tier.color2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="flame" size={32} color="#fff" />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={styles.daysNumber}>{days}</Text>
        <Text style={styles.daysLabel}>
          {days === 1 ? 'dia' : 'dias'} consecutivos
        </Text>
        <View style={styles.tierRow}>
          <Text style={styles.tierLabel}>{tier.label}</Text>
          {bestDays != null && bestDays > days && (
            <Text style={styles.best}>Recorde: {bestDays}</Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  daysLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: -2,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  best: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  compactText: {
    fontWeight: '800',
    fontSize: 13,
  },
});
