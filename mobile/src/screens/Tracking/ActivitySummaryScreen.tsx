import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
  ActionSheetIOS,
  Animated,
  Pressable,
  Easing,
} from 'react-native';
import MapView, { Polyline, Marker } from '../../components/map/SyncMap';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { TrackingStackParamList } from '../../navigation/types';
import { Activity } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { feedApi } from '../../services/feed.service';
import { generateWorkoutSummary } from '../../utils/workout-summary';
import { showToast } from '../../components/ui/Toast';
import PostWorkoutRatingModal from '../../components/PostWorkoutRatingModal';

type Props = {
  navigation: NativeStackNavigationProp<TrackingStackParamList, 'ActivitySummary'>;
  route: RouteProp<TrackingStackParamList, 'ActivitySummary'>;
};

const ACCENT = '#FF6B35';

const SPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: 'walk',
  cycling: 'bicycle',
  swimming: 'water',
  hiking: 'trail-sign',
  gym: 'barbell',
};

const SPORT_LABELS: Record<string, string> = {
  running: 'Corrida',
  cycling: 'Ciclismo',
  swimming: 'Natação',
  hiking: 'Trilha',
  gym: 'Academia',
};

interface PRResult {
  type: 'distance' | 'pace';
  label: string;
  value: string;
}

export default function ActivitySummaryScreen({ navigation, route }: Props) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [newPRs, setNewPRs] = useState<PRResult[]>([]);
  // Start hidden — show only after the user has seen the summary (2.5s delay)
  const [ratingModal, setRatingModal] = useState(false);
  const ratingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prBannerAnim = useRef(new Animated.Value(0)).current;

  // Celebration animation
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadActivity();
    return () => {
      // Clean up timer on unmount
      if (ratingTimerRef.current) clearTimeout(ratingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!loading && activity) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(checkScale, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
          Animated.timing(checkOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(statsSlide, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]).start(() => {
        // Show the rating modal only after the user has had time to see the summary
        ratingTimerRef.current = setTimeout(() => setRatingModal(true), 2500);
      });
    }
  }, [loading, activity]);

  const loadActivity = async () => {
    let loaded: Activity | null = null;
    try {
      const { data } = await api.get(`/activities/${route.params.activityId}`);
      loaded = data;
      setActivity(data);
      setLoading(false);
    } catch (error) {
      console.log('Error loading activity (attempt 1):', error);
      // Retry once after 1.5s — the finish endpoint may still be writing to DB
      try {
        await new Promise<void>((res) => setTimeout(res, 1500));
        const { data } = await api.get(`/activities/${route.params.activityId}`);
        loaded = data;
        setActivity(data);
      } catch (retryErr) {
        console.log('Error loading activity (attempt 2):', retryErr);
      } finally {
        setLoading(false);
      }
    }
    // PR detection — compare against history
    if (loaded) {
      detectPRs(loaded).catch(() => {});
    }
  };

  const detectPRs = async (current: Activity) => {
    try {
      const { data } = await api.get(`/activities?limit=100&sport=${current.sport}`);
      const history: Activity[] = (data.activities || data || []).filter(
        (a: Activity) => a.id !== current.id && a.isCompleted,
      );
      if (history.length === 0) return; // first activity of this sport — no PR to compare

      const prs: PRResult[] = [];
      const maxDist = Math.max(...history.map((a) => a.distance ?? 0));
      const bestPace = Math.min(...history.filter((a) => a.avgPace).map((a) => a.avgPace!));

      if ((current.distance ?? 0) > maxDist) {
        prs.push({
          type: 'distance',
          label: '🏅 Novo recorde de distância!',
          value: `${((current.distance ?? 0) / 1000).toFixed(2)} km`,
        });
      }
      if (current.avgPace && bestPace && current.avgPace < bestPace) {
        prs.push({
          type: 'pace',
          label: '⚡ Novo recorde de pace!',
          value: `${current.avgPace.toFixed(1)} min/km`,
        });
      }

      if (prs.length > 0) {
        setNewPRs(prs);
        Animated.spring(prBannerAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
      }
    } catch { /* non-critical */ }
  };

  const handleShare = async () => {
    if (!activity) return;
    try {
      const distKm = ((activity.distance ?? 0) / 1000).toFixed(2);
      await Share.share({
        message: `Completei ${distKm}km em ${formatDuration(activity.duration ?? 0)} no Sync! 🔥 #Sync #${activity.sport}`,
      });
    } catch {}
  };

  const generateGpx = (): string => {
    if (!activity?.points?.length) return '';
    const points = activity.points
      .map(
        (p) =>
          `    <trkpt lat="${p.latitude}" lon="${p.longitude}">\n      <time>${p.timestamp}</time>${p.altitude != null ? `\n      <ele>${p.altitude}</ele>` : ''}\n    </trkpt>`,
      )
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Sync App">\n  <trk>\n    <name>${activity.sport} - ${new Date(activity.startTime).toLocaleDateString('pt-BR')}</name>\n    <trkseg>\n${points}\n    </trkseg>\n  </trk>\n</gpx>`;
  };

  const generateCsv = (): string => {
    if (!activity?.points?.length) return '';
    const header = 'latitude,longitude,altitude,timestamp';
    const rows = activity.points.map((p) => `${p.latitude},${p.longitude},${p.altitude ?? ''},${p.timestamp}`);
    return [header, ...rows].join('\n');
  };

  const handleExport = () => {
    if (!activity) return;
    const doExport = (format: 'gpx' | 'csv') => {
      const content = format === 'gpx' ? generateGpx() : generateCsv();
      if (!content) {
        Alert.alert('Sem dados', 'Esta atividade não tem pontos GPS para exportar.');
        return;
      }
      Share.share({
        title: `atividade_${activity.sport}_${new Date(activity.startTime).toISOString().slice(0, 10)}.${format}`,
        message: content,
      }).catch(() => {});
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Exportar GPX', 'Exportar CSV'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) doExport('gpx');
          if (index === 2) doExport('csv');
        },
      );
    } else {
      Alert.alert('Exportar atividade', '', [
        { text: 'Exportar GPX', onPress: () => doExport('gpx') },
        { text: 'Exportar CSV', onPress: () => doExport('csv') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const handlePostToFeed = async () => {
    if (!activity || posting) return;
    setPosting(true);
    try {
      await feedApi.publish({
        activityId: activity.id,
        caption: `Mais um treino concluído! 🔥`,
        distanceKm: activity.distance / 1000,
        durationSeconds: activity.duration,
        avgPace: activity.avgPace,
        calories: estimateCalories(activity),
        sport: activity.sport,
      });
      setPosted(true);
      showToast('Publicado no feed! 🎉', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Erro ao publicar', 'error');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Salvando atividade…</Text>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={[styles.loadingText, { color: '#EF4444', marginTop: spacing.md }]}>
          Atividade não encontrada
        </Text>
        <TouchableOpacity style={styles.backFallback} onPress={() => navigation.popToTop()}>
          <Text style={{ color: ACCENT, fontWeight: '700' }}>Voltar ao início</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coordinates = activity.points?.map((p) => ({ latitude: p.latitude, longitude: p.longitude })) || [];
  const calories = estimateCalories(activity);
  const elevGain = estimateElevation(activity);
  const sportIcon = SPORT_ICONS[activity.sport] || 'fitness';
  const sportLabel = SPORT_LABELS[activity.sport] || activity.sport;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Celebration Header ── */}
        <LinearGradient
          colors={['rgba(255,107,53,0.18)', 'rgba(10,10,15,0)']}
          locations={[0, 1]}
          style={styles.heroGradient}
        >
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.topBtn} onPress={() => navigation.popToTop()}>
              <Ionicons name="close" size={20} color={colors.dark.text} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Atividade Salva</Text>
            <TouchableOpacity style={styles.topBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color={ACCENT} />
            </TouchableOpacity>
          </View>

          {/* Checkmark + sport badge */}
          <Animated.View style={[styles.celebrationCenter, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}>
            <View style={styles.checkCircle}>
              <LinearGradient colors={[ACCENT, '#FF3D00']} style={styles.checkGradient}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <View style={styles.sportBadge}>
              <Ionicons name={sportIcon} size={14} color={ACCENT} />
              <Text style={styles.sportBadgeText}>{sportLabel.toUpperCase()}</Text>
            </View>
          </Animated.View>

          {/* Date */}
          <Animated.Text style={[styles.dateText, { opacity: headerFade }]}>
            {new Date(activity.startTime).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
          </Animated.Text>
        </LinearGradient>

        {/* ── Hero Stat (distance) ── */}
        <Animated.View style={[styles.heroStat, { opacity: headerFade, transform: [{ translateY: statsSlide }] }]}>
          <Text style={styles.heroValue}>{((activity.distance ?? 0) / 1000).toFixed(2)}</Text>
          <Text style={styles.heroUnit}>km</Text>
        </Animated.View>

        {/* ── Map ── */}
        {coordinates.length > 1 && (
          <Animated.View style={[styles.mapContainer, { opacity: headerFade }]}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: coordinates[0].latitude,
                longitude: coordinates[0].longitude,
                latitudeDelta: 0.018,
                longitudeDelta: 0.018,
              }}
              scrollEnabled={false}
              userInterfaceStyle="dark"
              customMapStyle={darkMapStyle}
            >
              <Polyline coordinates={coordinates} strokeColor={ACCENT} strokeWidth={4} />
              <Marker coordinate={coordinates[0]}>
                <View style={[styles.mapDot, { backgroundColor: '#22C55E' }]}>
                  <Ionicons name="flag" size={9} color="#fff" />
                </View>
              </Marker>
              <Marker coordinate={coordinates[coordinates.length - 1]}>
                <View style={[styles.mapDot, { backgroundColor: ACCENT }]}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </View>
              </Marker>
            </MapView>
          </Animated.View>
        )}

        {/* ── Stats Grid ── */}
        <Animated.View style={[styles.statsSection, { opacity: headerFade, transform: [{ translateY: statsSlide }] }]}>
          <View style={styles.statsGrid}>
            <StatCard icon="time-outline" value={formatDuration(activity.duration ?? 0)} label="Tempo" />
            <StatCard
              icon="speedometer-outline"
              value={activity.avgPace ? `${activity.avgPace.toFixed(1)}'` : '--'}
              label="Ritmo /km"
            />
            <StatCard
              icon="flash-outline"
              value={activity.avgSpeed ? `${activity.avgSpeed.toFixed(1)}` : '--'}
              label="km/h"
            />
            <StatCard icon="flame-outline" value={`${calories}`} label="kcal" accent />
            {elevGain > 0 && (
              <StatCard icon="trending-up-outline" value={`+${elevGain}m`} label="Ganho alt." />
            )}
            {(activity.points?.length ?? 0) > 0 && (
              <StatCard icon="location-outline" value={`${activity.points?.length ?? 0}`} label="Pontos GPS" />
            )}
          </View>
        </Animated.View>

        {/* ── AI Summary ── */}
        <Animated.View style={[styles.summaryCard, { opacity: headerFade }]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles" size={16} color={ACCENT} />
            <Text style={styles.summaryTitle}>Resumo do treino</Text>
          </View>
          <Text style={styles.summaryText}>
            {generateWorkoutSummary({
              distanceKm: (activity.distance ?? 0) / 1000,
              durationMinutes: (activity.duration ?? 0) / 60,
              avgPaceMinPerKm: activity.avgPace || 0,
              calories,
              sport: activity.sport,
            })}
          </Text>
        </Animated.View>

        {/* ── PR Banner ── */}
        {newPRs.length > 0 && (
          <Animated.View style={[
            styles.prBanner,
            { opacity: prBannerAnim, transform: [{ scale: prBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
          ]}>
            <LinearGradient
              colors={['rgba(252,211,77,0.15)', 'rgba(252,211,77,0.05)']}
              style={styles.prBannerInner}
            >
              <View style={styles.prBannerTop}>
                <Ionicons name="trophy" size={24} color="#FCD34D" />
                <Text style={styles.prBannerTitle}>Novos Recordes Pessoais!</Text>
              </View>
              {newPRs.map((pr, i) => (
                <View key={i} style={styles.prRow}>
                  <Text style={styles.prLabel}>{pr.label}</Text>
                  <Text style={styles.prValue}>{pr.value}</Text>
                </View>
              ))}
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Actions ── */}
        <Animated.View style={[styles.actions, { opacity: headerFade }]}>
          {/* Primary: Post to feed */}
          {!posted ? (
            <Pressable
              onPress={handlePostToFeed}
              disabled={posting}
              style={({ pressed }) => [styles.postBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient colors={[ACCENT, '#FF3D00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.postBtnInner}>
                {posting ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.postBtnText}>Publicando…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="megaphone-outline" size={20} color="#fff" />
                    <Text style={styles.postBtnText}>Publicar no Feed</Text>
                    <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={styles.postedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.postedText}>Publicado no feed!</Text>
            </View>
          )}

          {/* Secondary: Export GPX */}
          {activity.points && activity.points.length > 0 && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleExport}>
              <Ionicons name="download-outline" size={18} color={ACCENT} />
              <Text style={styles.secondaryBtnText}>Exportar rota (GPX / CSV)</Text>
            </TouchableOpacity>
          )}

          {/* Tertiary: Go home */}
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.popToTop()}>
            <Text style={styles.homeBtnText}>Pronto</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Post-workout rating modal */}
      <PostWorkoutRatingModal
        visible={ratingModal && !!activity?.id}
        activityId={activity?.id || null}
        onClose={() => setRatingModal(false)}
        onSaved={() => setRatingModal(false)}
      />
    </View>
  );
}

// ─────────────────────── helpers ───────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function estimateCalories(activity: Activity): number {
  // MET × weight(70kg) × duration(h) — rough approximation
  const metMap: Record<string, number> = { running: 9, cycling: 7, swimming: 8, hiking: 6, gym: 5 };
  const met = metMap[activity.sport] || 6;
  const hours = (activity.duration ?? 0) / 3600;
  return Math.round(met * 70 * hours);
}

function estimateElevation(activity: Activity): number {
  if (!activity.points?.length) return 0;
  let gain = 0;
  for (let i = 1; i < activity.points.length; i++) {
    const diff = (activity.points[i].altitude ?? 0) - (activity.points[i - 1].altitude ?? 0);
    if (diff > 0) gain += diff;
  }
  return Math.round(gain);
}

// ─────────────────────── StatCard ───────────────────────

function StatCard({
  icon,
  value,
  label,
  accent = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[cardStyles.card, accent && cardStyles.cardAccent]}>
      <Ionicons name={icon} size={18} color={accent ? ACCENT : colors.dark.secondaryText} />
      <Text style={[cardStyles.value, accent && { color: ACCENT }]}>{value}</Text>
      <Text style={cardStyles.label}>{label}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  cardAccent: {
    borderColor: ACCENT + '35',
    backgroundColor: ACCENT + '0D',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
});

// ─────────────────────── map style ───────────────────────

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a28' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b88' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a28' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a40' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0e1a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#202030' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e1e30' }] },
];

// ─────────────────────── styles ───────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.dark.secondaryText,
    fontSize: fontSize.md,
  },
  backFallback: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  // Header / hero
  heroGradient: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  topTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.dark.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  celebrationCenter: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 14,
  },
  checkGradient: {
    flex: 1, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  sportBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT + '18',
    borderWidth: 1, borderColor: ACCENT + '35',
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: 20,
  },
  sportBadgeText: {
    color: ACCENT, fontSize: 11, fontWeight: '800', letterSpacing: 1.5,
  },
  dateText: {
    textAlign: 'center',
    color: colors.dark.secondaryText,
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
  },

  // Big distance stat
  heroStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: 6,
  },
  heroValue: {
    fontSize: 76,
    fontWeight: '200',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  heroUnit: {
    fontSize: 26,
    fontWeight: '300',
    color: colors.dark.secondaryText,
    paddingBottom: 8,
  },

  // Map
  mapContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    height: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing.lg,
  },
  map: { flex: 1 },
  mapDot: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.4)',
  },

  // Stats grid
  statsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // AI summary
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,107,53,0.06)',
    borderWidth: 1,
    borderColor: ACCENT + '25',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryText: {
    color: colors.dark.text,
    fontSize: fontSize.sm,
    lineHeight: 21,
    opacity: 0.9,
  },

  // Actions
  actions: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  postBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  postBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: spacing.lg,
  },
  postBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  postedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: '#22C55E40',
  },
  postedText: {
    color: '#22C55E',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: ACCENT + '12',
    borderWidth: 1,
    borderColor: ACCENT + '28',
  },
  secondaryBtnText: {
    color: ACCENT,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  homeBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  homeBtnText: {
    color: colors.dark.secondaryText,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // ── PR Banner ──────────────────────────────────────────────────────────────
  prBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.30)',
  },
  prBannerInner: { padding: spacing.lg, gap: spacing.sm },
  prBannerTop: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4,
  },
  prBannerTitle: { fontSize: 16, fontWeight: '800', color: '#FCD34D' },
  prRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  prLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  prValue: { fontSize: 13, color: '#FCD34D', fontWeight: '800' },
});
