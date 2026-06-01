import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Skeleton com shimmer suave — mostra enquanto dados carregam
export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <View
      style={[
        styles.base,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.03)',
            'rgba(255,255,255,0.10)',
            'rgba(255,255,255,0.03)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Lista de skeleton-rows (avatar + 2 linhas) — drop-in pra telas de lista
 * enquanto carregam (Ranking, Groups, Achievements, etc.)
 */
export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={{ paddingTop: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={styles.rowText}>
            <Skeleton width={'55%'} height={14} />
            <Skeleton width={'35%'} height={11} />
          </View>
          <Skeleton width={40} height={20} borderRadius={10} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowText: { flex: 1, gap: 8 },
});
