// Barra de XP com level + título.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { computeUserXP } from '../utils/xp-system';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  totalXP: number;
  compact?: boolean;
}

export default function XPBar({ totalXP, compact = false }: Props) {
  const xp = computeUserXP(totalXP);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.row}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LV {xp.level}</Text>
        </View>
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={['#FF6B35', '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${xp.progress * 100}%` }]}
            />
          </View>
          {!compact && (
            <Text style={styles.xpText}>
              {xp.currentLevelXP} / {xp.nextLevelXP} XP
            </Text>
          )}
        </View>
        {!compact && <Text style={styles.title}>{xp.title}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  wrapCompact: { padding: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  levelText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  xpText: { color: colors.dark.secondaryText, fontSize: 11, marginTop: 4 },
  title: { color: colors.dark.accent, fontWeight: '700', fontSize: 12 },
});
