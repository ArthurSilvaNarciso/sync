// Widget que mostra insights do IA Coach
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { colors, fontSize, spacing, borderRadius } from '../theme';

interface Insight {
  emoji: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  action?: string;
}

const TYPE_COLORS = {
  warning: '#F87171',
  info: '#3B82F6',
  success: '#10B981',
  tip: '#FF6B35',
};

export default function IACoachCard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/coach/insights')
      .then((r) => {
        setInsights(r.data?.insights || []);
        setSummary(r.data?.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || insights.length === 0) return null;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#4A0E2C', '#2A0518']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={styles.aiBadgeText}>IA COACH</Text>
          </View>
          <Text style={styles.headerTitle}>Insights pra você</Text>
        </View>
        {summary && (
          <View style={styles.summary}>
            <Text style={styles.summaryValue}>{summary.totalKm}</Text>
            <Text style={styles.summaryLabel}>km nos últimos 30 dias</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {insights.map((insight, i) => (
          <View key={i} style={[styles.insight, { borderColor: TYPE_COLORS[insight.type] + '40' }]}>
            <Text style={styles.emoji}>{insight.emoji}</Text>
            <Text style={[styles.insightTitle, { color: TYPE_COLORS[insight.type] }]}>{insight.title}</Text>
            <Text style={styles.insightMsg}>{insight.message}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,14,44,0.5)',
  },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flex: 1 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  aiBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  summary: { alignItems: 'flex-end' },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  scroll: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  insight: {
    width: 260,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  emoji: { fontSize: 28, marginBottom: 6 },
  insightTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  insightMsg: { color: colors.dark.text, fontSize: 12, lineHeight: 18 },
});
