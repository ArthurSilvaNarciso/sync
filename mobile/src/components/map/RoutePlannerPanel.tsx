// Painel inferior do planejador de rotas — mostra distância, tempo, calorias
// por esporte selecionado. Botão pra iniciar treino com rota planejada.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteResult, formatDistance, formatDuration, estimateTime } from '../../services/routing.service';
import { colors, fontSize, spacing, borderRadius } from '../../theme';

type Sport = 'walking' | 'running' | 'cycling';

const SPORT_CONFIG: Record<Sport, { icon: any; label: string; color: string }> = {
  walking: { icon: 'walk', label: 'Caminhada', color: '#10B981' },
  running: { icon: 'walk', label: 'Corrida', color: '#FF6B35' },
  cycling: { icon: 'bicycle', label: 'Ciclismo', color: '#3B82F6' },
};

interface Props {
  route: RouteResult | null;
  loading?: boolean;
  onStart?: (sport: Sport) => void;
  onClose?: () => void;
  onClear?: () => void;
}

export default function RoutePlannerPanel({ route, loading, onStart, onClose, onClear }: Props) {
  const [sport, setSport] = useState<Sport>('running');

  if (!route && !loading) {
    return (
      <View style={styles.hintBar}>
        <Ionicons name="hand-left-outline" size={16} color={colors.dark.secondaryText} />
        <Text style={styles.hintText}>
          Toque no mapa para escolher o destino e planejar sua rota
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingPanel}>
        <Ionicons name="navigate-circle" size={22} color="#FF6B35" />
        <Text style={styles.loadingText}>Calculando melhor rota…</Text>
      </View>
    );
  }

  const cfg = SPORT_CONFIG[sport];
  const duration = estimateTime(route!.distanceMeters, sport);
  const calories = route!.caloriesEstimate[sport];

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rota planejada</Text>
          <Text style={styles.subtitle}>
            {formatDistance(route!.distanceMeters)} • escolha o esporte
          </Text>
        </View>
        <TouchableOpacity onPress={onClear} hitSlop={10}>
          <Ionicons name="close-circle" size={24} color={colors.dark.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Sport tabs */}
      <View style={styles.tabs}>
        {(['walking', 'running', 'cycling'] as Sport[]).map((s) => {
          const c = SPORT_CONFIG[s];
          const active = sport === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.tab, active && { backgroundColor: c.color }]}
              onPress={() => setSport(s)}
            >
              <Ionicons name={c.icon} size={16} color={active ? '#fff' : c.color} />
              <Text style={[styles.tabLabel, active && { color: '#fff' }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats hero */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="speedometer" size={20} color={cfg.color} />
          <Text style={styles.statValue}>{formatDistance(route!.distanceMeters)}</Text>
          <Text style={styles.statLabel}>Distância</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="time" size={20} color={cfg.color} />
          <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          <Text style={styles.statLabel}>Tempo médio</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="flame" size={20} color={cfg.color} />
          <Text style={styles.statValue}>{calories}</Text>
          <Text style={styles.statLabel}>kcal</Text>
        </View>
      </View>

      {/* Quick info */}
      <View style={styles.quickInfo}>
        <Text style={styles.infoText}>
          📍 Pace estimado:{' '}
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            {sport === 'walking' ? '12 min/km' : sport === 'running' ? '6 min/km' : '20 km/h'}
          </Text>
        </Text>
      </View>

      {/* Start button */}
      <TouchableOpacity
        style={styles.startBtn}
        onPress={() => onStart?.(sport)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[cfg.color, cfg.color + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.startBtnInner}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.startBtnText}>Iniciar {cfg.label.toLowerCase()}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hintText: { color: colors.dark.text, fontSize: 12, flex: 1 },
  loadingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
  },
  loadingText: { color: colors.dark.text, fontWeight: '600', fontSize: 13 },
  panel: {
    backgroundColor: '#0A0A0F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.dark.secondaryText, fontSize: 12, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabLabel: { color: colors.dark.text, fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  statLabel: { color: colors.dark.secondaryText, fontSize: 10, textTransform: 'uppercase' },
  quickInfo: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: { color: colors.dark.secondaryText, fontSize: 12 },
  startBtn: { borderRadius: 14, overflow: 'hidden' },
  startBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
