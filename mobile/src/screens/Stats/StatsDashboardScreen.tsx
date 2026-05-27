// Dashboard de estatísticas — agregação semanal/mensal/anual com gráfico
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import api from '../../services/api';
import { computeUserXP } from '../../utils/xp-system';

type Period = 'week' | 'month' | 'year';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Activity {
  id: string;
  sport: string;
  distance: number; // meters
  duration: number; // seconds
  avgPace: number;
  startTime: string;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function isInPeriod(date: Date, period: Period): boolean {
  const now = new Date();
  if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  }
  if (period === 'month') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return date.getFullYear() === now.getFullYear();
}

export default function StatsDashboardScreen({ navigation }: any) {
  const [period, setPeriod] = useState<Period>('week');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/activities/history')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data[0] : r.data;
        setActivities(Array.isArray(list) ? list : (list?.activities || []));
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activities.filter((a) => isInPeriod(new Date(a.startTime), period));
  const totalKm = filtered.reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
  const totalDuration = filtered.reduce((sum, a) => sum + (a.duration || 0), 0);
  const totalActivities = filtered.length;
  const avgPace = filtered.length > 0
    ? filtered.reduce((sum, a) => sum + (a.avgPace || 0), 0) / filtered.length
    : 0;
  const totalCalories = Math.round(totalKm * 60);

  // Distribuição por esporte
  const sportCount: Record<string, number> = {};
  filtered.forEach((a) => {
    const s = (a.sport || 'running').toLowerCase();
    sportCount[s] = (sportCount[s] || 0) + 1;
  });
  const sportEntries = Object.entries(sportCount).sort((a, b) => b[1] - a[1]);

  // Bar chart: km por dia (últimos 7) ou por semana (mês)
  const buckets: { label: string; value: number }[] = [];
  if (period === 'week') {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const day = d.getDay();
      const sumKm = activities
        .filter((a) => {
          const ad = new Date(a.startTime);
          return ad.toDateString() === d.toDateString();
        })
        .reduce((s, a) => s + (a.distance || 0) / 1000, 0);
      buckets.push({ label: days[day], value: sumKm });
    }
  } else if (period === 'month') {
    for (let w = 4; w >= 1; w--) {
      const sumKm = filtered
        .filter((a) => {
          const day = new Date(a.startTime).getDate();
          return day > (4 - w) * 7 && day <= (5 - w) * 7;
        })
        .reduce((s, a) => s + (a.distance || 0) / 1000, 0);
      buckets.push({ label: `S${5 - w}`, value: sumKm });
    }
  } else {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let m = 0; m < 12; m++) {
      const sumKm = filtered
        .filter((a) => new Date(a.startTime).getMonth() === m)
        .reduce((s, a) => s + (a.distance || 0) / 1000, 0);
      buckets.push({ label: months[m], value: sumKm });
    }
  }
  const maxBucket = Math.max(...buckets.map((b) => b.value), 1);

  const xp = computeUserXP(Math.round(totalKm * 10) + totalActivities * 50);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Estatísticas</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['week', 'month', 'year'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodLabel, period === p && styles.periodLabelActive]}>
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* HERO STATS */}
      <LinearGradient
        colors={['#FF6B35', '#FF4500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View>
          <Text style={styles.heroLabel}>DISTÂNCIA TOTAL</Text>
          <Text style={styles.heroValue}>{totalKm.toFixed(1)}</Text>
          <Text style={styles.heroUnit}>quilômetros</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Ionicons name="trophy" size={36} color="rgba(255,255,255,0.8)" />
          <Text style={styles.heroLevel}>LV {xp.level}</Text>
          <Text style={styles.heroTitle}>{xp.title}</Text>
        </View>
      </LinearGradient>

      {/* STATS GRID */}
      <View style={styles.statsGrid}>
        {[
          { icon: 'fitness', value: totalActivities, label: 'Atividades', color: '#3B82F6' },
          { icon: 'time', value: formatDuration(totalDuration), label: 'Tempo', color: '#A78BFA' },
          { icon: 'flame', value: totalCalories, label: 'Calorias', color: '#FF6B35' },
          {
            icon: 'speedometer',
            value: avgPace ? `${Math.floor(avgPace)}:${Math.round((avgPace - Math.floor(avgPace)) * 60).toString().padStart(2, '0')}` : '--:--',
            label: 'Pace /km',
            color: '#10B981',
          },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={20} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* CHART */}
      <Text style={styles.sectionTitle}>Distância por {period === 'week' ? 'dia' : period === 'month' ? 'semana' : 'mês'}</Text>
      <View style={styles.chart}>
        {buckets.map((b, i) => {
          const h = Math.max((b.value / maxBucket) * 100, 4);
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={['#FF6B35', '#FF4500']}
                  style={[styles.bar, { height: `${h}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              </View>
              <Text style={styles.barValue}>{b.value > 0 ? b.value.toFixed(1) : ''}</Text>
              <Text style={styles.barLabel}>{b.label}</Text>
            </View>
          );
        })}
      </View>

      {/* SPORT DISTRIBUTION */}
      {sportEntries.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Por esporte</Text>
          <View style={styles.sportList}>
            {sportEntries.map(([sport, count]) => {
              const pct = (count / totalActivities) * 100;
              return (
                <View key={sport} style={styles.sportRow}>
                  <Text style={styles.sportName}>{sport}</Text>
                  <View style={styles.sportBar}>
                    <View style={[styles.sportBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.sportCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {filtered.length === 0 && !loading && (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={56} color={colors.dark.secondaryText} />
          <Text style={styles.emptyText}>
            Sem atividades neste período. Comece a treinar pra ver suas estatísticas aqui!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  title: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 6,
    marginBottom: spacing.md,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  periodBtnActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  periodLabel: { color: colors.dark.secondaryText, fontWeight: '700', fontSize: 13 },
  periodLabelActive: { color: '#fff' },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: 56, fontWeight: '900', letterSpacing: -2, lineHeight: 58 },
  heroUnit: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  heroLevel: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  heroTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  statLabel: { color: colors.dark.secondaryText, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: {
    color: colors.dark.text,
    fontSize: fontSize.md,
    fontWeight: '800',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    paddingHorizontal: spacing.md,
    gap: 4,
    marginBottom: spacing.lg,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barTrack: { width: '60%', height: 120, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  barValue: { color: colors.dark.text, fontSize: 9, fontWeight: '700', marginTop: 4 },
  barLabel: { color: colors.dark.secondaryText, fontSize: 10, marginTop: 2 },
  sportList: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sportName: {
    color: colors.dark.text,
    fontWeight: '600',
    width: 90,
    textTransform: 'capitalize',
    fontSize: 13,
  },
  sportBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sportBarFill: { height: '100%', backgroundColor: '#FF6B35' },
  sportCount: { color: colors.dark.text, fontWeight: '700', width: 24, textAlign: 'right' },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: 40 },
  emptyText: { color: colors.dark.secondaryText, textAlign: 'center', marginTop: spacing.md, fontSize: 14, lineHeight: 20 },
});
