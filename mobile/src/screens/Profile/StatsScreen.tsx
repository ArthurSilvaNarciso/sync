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
import { LinearGradient } from 'expo-linear-gradient';
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
  const [error, setError] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await statsService.getUserStats();
      setStats(data);
    } catch {
      setError(true);
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
        <LinearGradient
          colors={['#15152E', '#0E0E1E', '#0A0A0F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Estatísticas</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
        <View style={styles.center}>
          <Ionicons name={error ? 'cloud-offline-outline' : 'bar-chart-outline'} size={48} color={colors.dark.border} />
          <Text style={styles.emptyText}>
            {error ? 'Não foi possível carregar suas estatísticas.' : 'Nenhuma atividade registrada ainda'}
          </Text>
          {error && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={loadStats}
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente"
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          )}
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
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estatísticas</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

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
    backgroundColor: '#0A0A0F',
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
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: spacing.lg, backgroundColor: '#FF6B35',
    paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 62 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: 0.3,
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
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.20)',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    height: 140,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
