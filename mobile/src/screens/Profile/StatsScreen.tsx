import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { UserStats } from '../../types';
import { statsService } from '../../services/stats.service';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Stats'>;
};

const sportLabels: Record<string, string> = {
  running: 'Corrida',
  cycling: 'Ciclismo',
  swimming: 'Natacao',
  hiking: 'Trilha',
  gym: 'Academia',
  yoga: 'Yoga',
  football: 'Futebol',
  basketball: 'Basquete',
  tennis: 'Tenis',
};

const sportColors: Record<string, string> = {
  running: '#FF6B35',
  cycling: '#2E7BFF',
  swimming: '#00BCD4',
  football: '#4CAF50',
  basketball: '#FF9800',
  tennis: '#CDDC39',
  yoga: '#8BC34A',
  gym: '#F44336',
  hiking: '#795548',
};

export default function StatsScreen({ navigation }: Props) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await statsService.getUserStats();
      setStats(data);
    } catch {
      // sem dados
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}min`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.dark.accent} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Estatisticas</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.dark.border} />
          <Text style={styles.emptyText}>Nenhuma atividade registrada ainda</Text>
        </View>
      </View>
    );
  }

  const maxWeeklyDist = stats.weeklyStats?.length
    ? Math.max(...stats.weeklyStats.map((w) => w.distance), 1)
    : 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estatisticas</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Top metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="map-outline" size={22} color={colors.dark.accent} />
            <Text style={styles.metricValue}>
              {(stats.totalDistance / 1000).toFixed(1)}
            </Text>
            <Text style={styles.metricUnit}>km totais</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="fitness-outline" size={22} color={colors.dark.accent} />
            <Text style={styles.metricValue}>{stats.totalActivities}</Text>
            <Text style={styles.metricUnit}>atividades</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="time-outline" size={22} color={colors.dark.accent} />
            <Text style={styles.metricValue}>{formatDuration(stats.totalDuration)}</Text>
            <Text style={styles.metricUnit}>tempo total</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="speedometer-outline" size={22} color={colors.dark.accent} />
            <Text style={styles.metricValue}>
              {stats.averagePace ? stats.averagePace.toFixed(1) : '--'}
            </Text>
            <Text style={styles.metricUnit}>pace médio</Text>
          </View>
        </View>

        {/* Streak */}
        <View style={styles.streakCard}>
          <View style={styles.streakItem}>
            <Text style={styles.streakValue}>{stats.currentStreak}</Text>
            <Text style={styles.streakLabel}>Sequência atual</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>dias</Text>
            </View>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Text style={styles.streakValue}>{stats.bestStreak}</Text>
            <Text style={styles.streakLabel}>Melhor sequência</Text>
            <View style={[styles.streakBadge, { backgroundColor: colors.dark.accent + '20' }]}>
              <Text style={[styles.streakBadgeText, { color: colors.dark.accent }]}>recorde</Text>
            </View>
          </View>
        </View>

        {/* Weekly chart */}
        {stats.weeklyStats && stats.weeklyStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimos 7 dias</Text>
            <View style={styles.weeklyChart}>
              {stats.weeklyStats.slice(-7).map((week, index) => {
                const barHeight = Math.max(4, (week.distance / maxWeeklyDist) * 80);
                const dayLabel = new Date(week.date).toLocaleDateString('pt-BR', { weekday: 'short' });
                return (
                  <View key={index} style={styles.weeklyBar}>
                    <Text style={styles.weeklyKm}>
                      {week.distance > 0 ? `${(week.distance / 1000).toFixed(1)}` : ''}
                    </Text>
                    <View
                      style={[
                        styles.weeklyBarFill,
                        {
                          height: barHeight,
                          backgroundColor:
                            week.distance > 0 ? colors.dark.accent : colors.dark.border,
                        },
                      ]}
                    />
                    <Text style={styles.weeklyDay}>{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Sport breakdown */}
        {stats.sportBreakdown && stats.sportBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Por esporte</Text>
            {stats.sportBreakdown.map((sport) => {
              const color = sportColors[sport.sport] || colors.dark.accent;
              const totalPercent =
                stats.totalActivities > 0
                  ? (sport.count / stats.totalActivities) * 100
                  : 0;
              return (
                <View key={sport.sport} style={styles.sportRow}>
                  <View style={[styles.sportDot, { backgroundColor: color }]} />
                  <View style={styles.sportInfo}>
                    <View style={styles.sportHeader}>
                      <Text style={styles.sportName}>
                        {sportLabels[sport.sport] || sport.sport}
                      </Text>
                      <Text style={styles.sportCount}>{sport.count}x</Text>
                    </View>
                    <View style={styles.sportBar}>
                      <View
                        style={[
                          styles.sportBarFill,
                          { width: `${totalPercent}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                    <Text style={styles.sportDist}>
                      {(sport.totalDistance / 1000).toFixed(1)} km •{' '}
                      {formatDuration(sport.totalDuration)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Social stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <View style={styles.socialGrid}>
            <View style={styles.socialCard}>
              <Ionicons name="heart" size={24} color={colors.dark.accent} />
              <Text style={styles.socialValue}>{stats.totalMatches}</Text>
              <Text style={styles.socialLabel}>Matches</Text>
            </View>
            <View style={styles.socialCard}>
              <Ionicons name="calendar" size={24} color={colors.dark.accent} />
              <Text style={styles.socialValue}>{stats.totalEvents}</Text>
              <Text style={styles.socialLabel}>Eventos</Text>
            </View>
            <View style={styles.socialCard}>
              <Ionicons name="trophy-outline" size={24} color={colors.dark.accent} />
              <Text style={styles.socialValue}>
                {stats.longestActivity > 0
                  ? `${(stats.longestActivity / 1000).toFixed(1)}km`
                  : '--'}
              </Text>
              <Text style={styles.socialLabel}>Maior distância</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.dark.secondaryText,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.dark.text,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    fontSize: 11,
    color: colors.dark.secondaryText,
    textTransform: 'uppercase',
  },
  streakCard: {
    flexDirection: 'row',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  streakDivider: {
    width: 1,
    backgroundColor: colors.dark.border,
    marginVertical: spacing.xs,
  },
  streakValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    textAlign: 'center',
  },
  streakBadge: {
    backgroundColor: colors.dark.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  streakBadgeText: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.dark.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  weeklyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
    height: 140,
  },
  weeklyBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  weeklyKm: {
    fontSize: 9,
    color: colors.dark.secondaryText,
    fontVariant: ['tabular-nums'],
  },
  weeklyBarFill: {
    width: '80%',
    borderRadius: 3,
    minHeight: 4,
  },
  weeklyDay: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    textTransform: 'uppercase',
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sportDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sportInfo: {
    flex: 1,
  },
  sportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sportName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.dark.text,
  },
  sportCount: {
    fontSize: fontSize.sm,
    color: colors.dark.secondaryText,
  },
  sportBar: {
    height: 4,
    backgroundColor: colors.dark.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  sportBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sportDist: {
    fontSize: 11,
    color: colors.dark.secondaryText,
  },
  socialGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  socialCard: {
    flex: 1,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  socialValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.dark.text,
  },
  socialLabel: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    textAlign: 'center',
  },
});
