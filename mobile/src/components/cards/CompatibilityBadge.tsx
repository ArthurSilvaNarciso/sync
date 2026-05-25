import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CompatibilityResult } from '../../utils/matchCompatibility';

interface Props {
  result: CompatibilityResult;
  compact?: boolean;
}

/**
 * Badge bonito mostrando % de compatibilidade entre 2 atletas.
 * Variante compact pra cards de match, full pra detalhes de perfil.
 */
export default function CompatibilityBadge({ result, compact }: Props) {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fill, {
      toValue: result.score / 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [result.score, fill]);

  if (compact) {
    return (
      <View style={[styles.compact, { borderColor: result.color }]}>
        <Text style={styles.compactEmoji}>{result.emoji}</Text>
        <Text style={[styles.compactScore, { color: result.color }]}>{result.score}%</Text>
      </View>
    );
  }

  const widthInterp = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{result.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Compatibilidade</Text>
          <Text style={[styles.score, { color: result.color }]}>{result.score}%</Text>
        </View>
        <Text style={[styles.tier, { color: result.color }]}>{result.tier.toUpperCase()}</Text>
      </View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: widthInterp }]}>
          <LinearGradient
            colors={[result.color, `${result.color}99`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {result.reasons.length > 0 && (
        <View style={styles.reasonsBox}>
          {result.reasons.map((r, i) => (
            <Text key={i} style={styles.reason}>• {r}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  emoji: { fontSize: 26 },
  label: {
    fontSize: 10,
    color: '#8E8EA0',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  score: {
    fontSize: 26,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 30,
  },
  tier: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  reasonsBox: {
    marginTop: 10,
    gap: 3,
  },
  reason: {
    fontSize: 11,
    color: '#B8B8CC',
  },
  // Compact variant
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  compactEmoji: { fontSize: 12 },
  compactScore: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
