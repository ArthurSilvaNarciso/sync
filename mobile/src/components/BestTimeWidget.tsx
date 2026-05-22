// Widget que mostra o "score" de exercício para as próximas 12h.
// KILLER FEATURE: pico destacado, micro-recomendação dinâmica.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing, borderRadius } from '../theme';
import api from '../services/api';

const ACCENT = '#FF6B35';

type HourlyScore = {
  time: string;
  temperature: number;
  weatherDescription: string;
  score: number;
};

type Recommendation = {
  bestTimeWindow: { start: string; end: string; avgScore: number; temperature: number; weatherDescription: string };
  hourlyScores: HourlyScore[];
  bestActivities: string[];
  recommendation: string;
};

const scoreColor = (score: number) => {
  if (score >= 80) return '#4ADE80';
  if (score >= 60) return ACCENT;
  if (score >= 40) return '#FAAD14';
  return '#F87171';
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.getHours().toString().padStart(2, '0') + 'h';
};

export default function BestTimeWidget({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
  apiBase?: string;
}) {
  const [data, setData] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: j } = await api.get('/weather/recommendation', {
          params: { lat: latitude, lng: longitude },
        });
        setData(j);
      } catch {
        // silencia — widget oculta-se se falhar
      } finally {
        setLoading(false);
      }
    })();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }

  if (!data) return null;

  const next12 = data.hourlyScores.slice(0, 12);
  const peakIdx = next12.reduce(
    (best, h, i) => (h.score > next12[best].score ? i : best),
    0,
  );
  const peak = next12[peakIdx];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.85}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="time" size={16} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Melhor hora pra treinar</Text>
            <Text style={styles.subtitle}>
              Pico às {fmt(peak.time)} ({Math.round(peak.temperature)}°C • score{' '}
              <Text style={{ color: scoreColor(peak.score), fontWeight: '800' }}>
                {Math.round(peak.score)}
              </Text>
              )
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.secondaryText}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartRow}
          >
            {next12.map((h, i) => {
              const isPeak = i === peakIdx;
              const heightPct = Math.max(8, h.score); // mínimo visual de 8%
              return (
                <View key={h.time} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    {isPeak ? (
                      <LinearGradient
                        colors={[ACCENT, '#FF5021']}
                        style={[styles.bar, { height: `${heightPct}%` }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${heightPct}%`,
                            backgroundColor: scoreColor(h.score) + '88',
                          },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={[styles.barLabel, isPeak && { color: ACCENT, fontWeight: '800' }]}>
                    {fmt(h.time)}
                  </Text>
                  <Text style={styles.barScore}>{Math.round(h.score)}</Text>
                </View>
              );
            })}
          </ScrollView>

          <Text style={styles.recoText}>{data.recommendation}</Text>
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
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {},
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: 2,
  },
  chartRow: {
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: 2,
  },
  barCol: {
    width: 28,
    alignItems: 'center',
  },
  barTrack: {
    height: 80,
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 9,
    color: colors.secondaryText,
    marginTop: 4,
    fontWeight: '600',
  },
  barScore: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  recoText: {
    fontSize: fontSize.xs,
    color: colors.text,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
