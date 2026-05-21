// Widget "Today Brief" — agrega sunrise/sunset, AQI, workout idea, hidratação.
// Aparece em Discovery/Tracking/Profile como cartão diário.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  fetchSunData,
  fetchAirQuality,
  getWorkoutIdea,
  recommendHydration,
  getDailyQuote,
  type SunData,
  type AirQuality,
} from '../services/external-apis';
import { colors, fontSize, spacing, borderRadius } from '../theme';

const ACCENT = '#FF6B35';

type Props = {
  latitude: number;
  longitude: number;
  weightKg?: number;
  preferredSport?: string;
};

export default function TodayBriefWidget({ latitude, longitude, weightKg = 70, preferredSport }: Props) {
  const [sun, setSun] = useState<SunData | null>(null);
  const [aqi, setAqi] = useState<AirQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const workout = getWorkoutIdea(preferredSport);
  const hydration = recommendHydration(weightKg);
  const quote = getDailyQuote();

  useEffect(() => {
    Promise.allSettled([
      fetchSunData(latitude, longitude),
      fetchAirQuality(latitude, longitude),
    ])
      .then(([s, a]) => {
        if (s.status === 'fulfilled') setSun(s.value);
        if (a.status === 'fulfilled') setAqi(a.value);
      })
      .finally(() => setLoading(false));
  }, [latitude, longitude]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={ACCENT} />
        <Text style={styles.headerText}>SEU DIA HOJE</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      ) : (
        <>
          {/* Sun + AQI row */}
          <View style={styles.row}>
            {sun && (
              <View style={styles.cardSmall}>
                <Ionicons name="sunny" size={18} color="#FFB13B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>Sol</Text>
                  <Text style={styles.cardValue}>{sun.sunrise} → {sun.sunset}</Text>
                </View>
              </View>
            )}
            {aqi && (
              <View style={[styles.cardSmall, { borderColor: aqi.color + '40' }]}>
                <View style={[styles.aqiDot, { backgroundColor: aqi.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>Ar</Text>
                  <Text style={styles.cardValue}>{aqi.level} (AQI {aqi.aqi})</Text>
                </View>
              </View>
            )}
          </View>

          {/* Workout idea */}
          <LinearGradient
            colors={[ACCENT + '20', ACCENT + '08']}
            style={styles.workoutCard}
          >
            <View style={styles.workoutLeft}>
              <Ionicons name="flash" size={20} color={ACCENT} />
              <View style={{ flex: 1 }}>
                <Text style={styles.workoutTitle}>{workout.title}</Text>
                <Text style={styles.workoutDesc}>{workout.desc}</Text>
              </View>
            </View>
            <View style={styles.workoutMin}>
              <Text style={styles.workoutMinValue}>{workout.duration}</Text>
              <Text style={styles.workoutMinLabel}>min</Text>
            </View>
          </LinearGradient>

          {/* Hydration */}
          <View style={styles.hydration}>
            <Ionicons name="water" size={16} color="#2E7BFF" />
            <Text style={styles.hydrationText}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {(hydration.ml / 1000).toFixed(1)}L
              </Text>{' '}
              hoje • {hydration.glasses} copos
            </Text>
          </View>

          {/* Daily quote */}
          <View style={styles.quoteBox}>
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 1,
  },
  loader: { padding: spacing.lg, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
    padding: 10,
  },
  aqiDot: { width: 12, height: 12, borderRadius: 6 },
  cardLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    marginTop: 1,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: ACCENT + '30',
    marginBottom: spacing.sm,
  },
  workoutLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workoutTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  workoutDesc: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: 2,
  },
  workoutMin: { alignItems: 'center', minWidth: 40 },
  workoutMinValue: {
    fontSize: 22,
    fontWeight: '800',
    color: ACCENT,
    lineHeight: 24,
  },
  workoutMinLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  hydration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(46,123,255,0.08)',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  hydrationText: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  quoteBox: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  quoteText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  quoteAuthor: {
    fontSize: 10,
    color: ACCENT,
    fontWeight: '600',
    marginTop: 4,
  },
});
