import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { segmentsApi, Segment, formatElapsed } from '../../services/segments.service';
import { getCurrentLocation } from '../../services/location.service';
import { SkeletonList } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';

type Props = { navigation: NativeStackNavigationProp<ProfileStackParamList, 'SegmentsList'> };

const sportIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: 'walk',
  cycling: 'bicycle',
  swimming: 'water',
  hiking: 'trail-sign',
};

export default function SegmentsListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [trending, setTrending] = useState<(Segment & { recentCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [noGps, setNoGps] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setNoGps(false);
    // "Em alta" é global (não precisa de GPS) — carrega em paralelo, sem bloquear
    segmentsApi.trending().then(setTrending).catch(() => {});
    try {
      const coords = await getCurrentLocation();
      const data = await segmentsApi.nearby(coords.latitude, coords.longitude, 25);
      setSegments(data);
    } catch (e: any) {
      // Distingue "sem GPS" de "erro de rede"
      if (e?.message && /local|permiss|gps|denied/i.test(String(e.message))) {
        setNoGps(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Segment }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('SegmentDetail', { segmentId: item.id })}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={sportIcons[item.sport] || 'flag'} size={20} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardMetaRow}>
          <Ionicons name="resize-outline" size={13} color={colors.secondaryText} />
          <Text style={styles.cardMeta}>{(item.distanceMeters / 1000).toFixed(2)} km</Text>
          <Ionicons name="people-outline" size={13} color={colors.secondaryText} style={{ marginLeft: 10 }} />
          <Text style={styles.cardMeta}>{item.attemptsCount} tentativas</Text>
        </View>
      </View>
      {item.bestTimeSec != null && (
        <View style={styles.komBadge}>
          <Ionicons name="trophy" size={12} color="#FFD700" />
          <Text style={styles.komTime}>{formatElapsed(item.bestTimeSec)}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        style={[styles.header, { paddingTop: Math.max(insets.top + 12, 56) }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Segmentos</Text>
          <Text style={styles.subtitle}>Trechos cronometrados perto de você</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ paddingTop: spacing.md }}>
          <SkeletonList count={6} />
        </View>
      ) : error ? (
        <ErrorState onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={segments}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            trending.length > 0 ? (
              <View style={styles.trendWrap}>
                <View style={styles.trendTitleRow}>
                  <Ionicons name="flame" size={16} color="#FF6B35" />
                  <Text style={styles.trendTitle}>Em alta</Text>
                </View>
                {trending.slice(0, 5).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.trendCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('SegmentDetail', { segmentId: t.id })}
                  >
                    <View style={styles.trendFire}>
                      <Ionicons name="flame" size={16} color="#FF6B35" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.cardMeta}>{t.recentCount} tentativas nos últimos 14 dias</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
                  </TouchableOpacity>
                ))}
                <Text style={styles.nearbyHeading}>Perto de você</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            noGps ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="location-outline" size={56} color={colors.secondaryText} />
                <Text style={styles.emptyTitle}>Ative sua localização</Text>
                <Text style={styles.emptyText}>
                  Libere o GPS para ver segmentos perto de você. (Os "Em alta" acima funcionam sem GPS.)
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.retryText}>Tentar de novo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="flag-outline" size={56} color={colors.secondaryText} />
                <Text style={styles.emptyTitle}>Nenhum segmento por aqui</Text>
                <Text style={styles.emptyText}>
                  Crie um segmento a partir de um treino para competir com outros atletas.
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#15151F',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  trendWrap: { marginBottom: spacing.xs },
  trendTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  trendTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  trendCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#15151F', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.25)',
  },
  trendFire: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,107,53,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  nearbyHeading: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  cardIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardMeta: { fontSize: fontSize.xs, color: colors.secondaryText },
  komBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full,
  },
  komTime: { fontSize: fontSize.xs, fontWeight: '800', color: '#FFD700' },
  emptyWrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 80, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: fontSize.sm, color: colors.secondaryText, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md,
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: 14,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
