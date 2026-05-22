// Card de Daily Quests — mostra 3 quests do dia + countdown.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getTodayQuests, questsResetCountdown, Quest } from '../utils/daily-quests';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  /** progresso atual de cada quest (0..1) — opcional */
  progressMap?: Record<string, number>;
}

export default function DailyQuestsCard({ progressMap = {} }: Props) {
  const [quests, setQuests] = useState<Quest[]>(() => getTodayQuests());
  const [countdown, setCountdown] = useState(() => questsResetCountdown());

  useEffect(() => {
    const t = setInterval(() => setCountdown(questsResetCountdown()), 60000);
    return () => clearInterval(t);
  }, []);

  // Recarrega quests se mudar de dia
  useEffect(() => {
    if (countdown.hours === 23 && countdown.minutes === 59) {
      setQuests(getTodayQuests());
    }
  }, [countdown]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="trophy" size={18} color={colors.dark.accent} />
          <Text style={styles.title}>Missões do dia</Text>
        </View>
        <View style={styles.timerWrap}>
          <Ionicons name="time-outline" size={12} color={colors.dark.secondaryText} />
          <Text style={styles.timerText}>
            {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}
          </Text>
        </View>
      </View>

      {quests.map((q) => {
        const progress = Math.min(1, progressMap[q.id] || 0);
        const done = progress >= 1;
        return (
          <View key={q.id} style={[styles.quest, done && styles.questDone]}>
            <Text style={styles.questIcon}>{q.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.questTitle, done && styles.questTitleDone]}>{q.title}</Text>
              <Text style={styles.questDesc}>{q.description}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+{q.xpReward}</Text>
              <Text style={styles.xpBadgeLabel}>XP</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: { color: colors.dark.text, fontWeight: '700', fontSize: fontSize.md },
  timerWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { color: colors.dark.secondaryText, fontSize: 12, fontWeight: '600' },
  quest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  questDone: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  questIcon: { fontSize: 22 },
  questTitle: { color: colors.dark.text, fontWeight: '700', fontSize: 13 },
  questTitleDone: { textDecorationLine: 'line-through', color: colors.dark.secondaryText },
  questDesc: { color: colors.dark.secondaryText, fontSize: 11, marginTop: 2 },
  progressTrack: {
    marginTop: 4,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.dark.accent, borderRadius: 2 },
  xpBadge: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 48,
  },
  xpBadgeText: { color: '#FF6B35', fontWeight: '800', fontSize: 12 },
  xpBadgeLabel: { color: '#FF6B35', fontSize: 9, fontWeight: '700' },
});
