// Tela de planos de treino — escolha 5K / 10K / 21K e veja semana atual
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLANS, TrainingPlan, WeekPlan, getCurrentWeek } from '../../utils/training-plans';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STORAGE_KEY = '@sync:training-plan';

const WORKOUT_ICONS: Record<string, string> = {
  easy: 'walk', long: 'trail-sign', interval: 'flash',
  tempo: 'speedometer', recovery: 'leaf', rest: 'bed',
};

export default function TrainingPlanScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [currentWeek, setCurrentWeek] = useState<WeekPlan | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((s) => {
      if (s) {
        const { id, startedAt } = JSON.parse(s);
        const p = PLANS.find((p) => p.id === id);
        if (p) {
          setSelectedPlan(p);
          setStartedAt(new Date(startedAt));
          setCurrentWeek(getCurrentWeek(p, new Date(startedAt)));
        }
      }
    });
  }, []);

  const startPlan = (plan: TrainingPlan) => {
    const start = new Date();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ id: plan.id, startedAt: start.toISOString() }));
    setSelectedPlan(plan);
    setStartedAt(start);
    setCurrentWeek(getCurrentWeek(plan, start));
  };

  const stopPlan = () => {
    AsyncStorage.removeItem(STORAGE_KEY);
    setSelectedPlan(null);
    setStartedAt(null);
    setCurrentWeek(null);
  };

  if (selectedPlan && currentWeek) {
    const weekIndex = currentWeek.weekNumber;
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={['#15152E', '#0E0E1E', '#0A0A0F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}
        >
          <TouchableOpacity
            onPress={() => navigation?.goBack?.()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{selectedPlan.name}</Text>
          <TouchableOpacity
            onPress={stopPlan}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Encerrar plano de treino"
          >
            <Ionicons name="close-circle-outline" size={22} color={colors.dark.secondaryText} />
          </TouchableOpacity>
        </LinearGradient>

        <LinearGradient
          colors={['#FF6B35', '#FF4500']}
          style={styles.banner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View>
            <Text style={styles.bannerLabel}>SEMANA {weekIndex} de {selectedPlan.weeks}</Text>
            <Text style={styles.bannerGoal}>{currentWeek.goal}</Text>
          </View>
          <View style={styles.weekDots}>
            {selectedPlan.plan.map((w) => (
              <View
                key={w.weekNumber}
                style={[styles.dot, w.weekNumber < weekIndex && styles.dotDone, w.weekNumber === weekIndex && styles.dotCurrent]}
              />
            ))}
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Esta semana</Text>
        {currentWeek.workouts.map((w, i) => (
          <View key={i} style={styles.workout}>
            <View style={[styles.workoutIcon, w.type === 'rest' && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Ionicons name={(WORKOUT_ICONS[w.type] as any) || 'walk'} size={18} color={w.type === 'rest' ? '#888' : '#FF6B35'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workoutTitle}>{i + 1}. {w.title}</Text>
              <Text style={styles.workoutDesc}>{w.description}</Text>
              {w.targetKm && <Text style={styles.workoutMeta}>🎯 {w.targetKm} km</Text>}
              {w.targetMinutes && <Text style={styles.workoutMeta}>⏱️ {w.targetMinutes} min</Text>}
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Próximas semanas</Text>
        {selectedPlan.plan.slice(weekIndex).map((w) => (
          <View key={w.weekNumber} style={styles.nextWeek}>
            <Text style={styles.nextWeekNum}>Semana {w.weekNumber}</Text>
            <Text style={styles.nextWeekGoal}>{w.goal}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}
      >
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Treinos programados</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>
      <Text style={styles.subtitle}>Escolha sua meta. 100% grátis, baseado em ciência.</Text>

      {PLANS.map((plan) => (
        <TouchableOpacity key={plan.id} style={styles.planCard} onPress={() => startPlan(plan)} activeOpacity={0.85}>
          <LinearGradient
            colors={plan.level === 'beginner' ? ['#10B981', '#059669'] : plan.level === 'intermediate' ? ['#3B82F6', '#1E40AF'] : ['#FF6B35', '#FF4500']}
            style={styles.planBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.planGoal}>{plan.goalDistanceKm}K</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <Text style={styles.planMeta}>📅 {plan.weeks} semanas</Text>
              <Text style={styles.planMeta}>📊 {plan.level === 'beginner' ? 'Iniciante' : plan.level === 'intermediate' ? 'Intermediário' : 'Avançado'}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.dark.secondaryText} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md, // paddingTop dinâmico via insets no JSX
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.dark.text },
  subtitle: { color: colors.dark.secondaryText, paddingHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.sm },
  planCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.055)', borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  planBadge: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  planGoal: { color: '#fff', fontWeight: '900', fontSize: 22 },
  planName: { color: colors.dark.text, fontWeight: '700', fontSize: fontSize.md },
  planDesc: { color: colors.dark.secondaryText, fontSize: 12, marginTop: 2 },
  planMeta: { color: colors.dark.accent, fontSize: 11, fontWeight: '600' },
  banner: {
    marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  bannerLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  bannerGoal: { color: '#fff', fontWeight: '800', fontSize: fontSize.lg, marginTop: 4 },
  weekDots: { flexDirection: 'row', gap: 4, marginTop: spacing.md, flexWrap: 'wrap' },
  dot: { width: 18, height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 },
  dotDone: { backgroundColor: '#fff' },
  dotCurrent: { backgroundColor: '#FFE5D6', height: 6, marginTop: -1 },
  sectionTitle: {
    color: colors.dark.text, fontWeight: '800', fontSize: fontSize.md,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  workout: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(255,107,53,0.20)',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  workoutIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,107,53,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  workoutTitle: { color: colors.dark.text, fontWeight: '700', fontSize: 14 },
  workoutDesc: { color: colors.dark.secondaryText, fontSize: 12, marginTop: 2 },
  workoutMeta: { color: colors.dark.accent, fontSize: 11, marginTop: 4, fontWeight: '600' },
  nextWeek: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  nextWeekNum: { color: colors.dark.secondaryText, fontWeight: '600' },
  nextWeekGoal: { color: colors.dark.text, fontSize: 12, fontWeight: '600' },
});
