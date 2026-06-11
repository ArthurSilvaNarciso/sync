import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { matchingApi, LikeReceivedItem } from '../../services/matching.service';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { useHaptic } from '../../hooks/useHaptic';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#FF6B35';

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function LikesReceivedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const haptic = useHaptic();
  const [items, setItems] = useState<LikeReceivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const list = await matchingApi.likesReceived();
      setItems(list);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const respond = useCallback(
    async (item: LikeReceivedItem, action: 'like' | 'pass') => {
      if (actioning[item.likeId]) return;
      setActioning((p) => ({ ...p, [item.likeId]: true }));
      try {
        const res = await matchingApi.swipe(item.user.id, action);
        if (action === 'like') {
          haptic.success();
          if (res.matched) {
            navigation.navigate('MatchScreen', { matchId: res.matchId, userName: item.user.name, userId: item.user.id });
          }
        } else {
          haptic.light();
        }
      } catch {
        haptic.error();
      } finally {
        setItems((prev) => prev.filter((x) => x.likeId !== item.likeId));
        setActioning((p) => {
          const copy = { ...p };
          delete copy[item.likeId];
          return copy;
        });
      }
    },
    [actioning, haptic, navigation],
  );

  const HeaderBar = () => (
    <LinearGradient
      colors={['#15152E', '#0E0E1E', '#0A0A0F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.header, { paddingTop: Math.max(insets.top + 10, 44) }]}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={styles.title}>Quem te curtiu</Text>
        {items.length > 0 && (
          <Text style={styles.subtitle}>{items.length} {items.length === 1 ? 'curtida' : 'curtidas'} pendentes</Text>
        )}
      </View>
      <View style={{ width: 38 }} />
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <HeaderBar />
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={88} borderRadius={16} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBar />

      {items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="heart-outline"
            title="Nenhuma curtida pendente"
            subtitle="Quando alguém te curtir, vai aparecer aqui. Continue se mostrando!"
            ctaLabel="Voltar pra descoberta"
            onCtaPress={() => navigation.goBack()}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.likeId}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.user.avatarUrl ? (
                <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.initial}>{item.user.name?.[0]?.toUpperCase()}</Text>
                </View>
              )}

              {item.isSuperLike && (
                <View style={styles.superBadge}>
                  <Ionicons name="star" size={11} color="#fff" />
                </View>
              )}

              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
                  <Text style={styles.time}>{relativeDate(item.createdAt)}</Text>
                </View>
                {!!item.user.bio && (
                  <Text style={styles.bio} numberOfLines={2}>{item.user.bio}</Text>
                )}
                {!!item.user.sports && item.user.sports.length > 0 && (
                  <View style={styles.sportsRow}>
                    {item.user.sports.slice(0, 3).map((s) => (
                      <View key={s} style={styles.sportPill}>
                        <Text style={styles.sportTxt}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPass]}
                  onPress={() => respond(item, 'pass')}
                  disabled={!!actioning[item.likeId]}
                  hitSlop={6}
                >
                  {actioning[item.likeId] ? (
                    <ActivityIndicator size="small" color="#999" />
                  ) : (
                    <Ionicons name="close" size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionLike]}
                  onPress={() => respond(item, 'like')}
                  disabled={!!actioning[item.likeId]}
                  hitSlop={6}
                >
                  {actioning[item.likeId] ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="heart" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    // paddingTop dinâmico via insets no JSX (notch/safe-area)
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 11, color: '#FF6B35', fontWeight: '600', marginTop: 2 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#252540',
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontSize: 22, fontWeight: '800' },
  superBadge: {
    position: 'absolute',
    top: 10,
    left: 56,
    backgroundColor: ACCENT,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0F',
  },
  name: { color: '#fff', fontSize: fontSize.md, fontWeight: '800', flex: 1 },
  time: { color: '#8E8EA0', fontSize: 11 },
  bio: { color: '#B8B8CC', fontSize: 12, marginTop: 3, lineHeight: 16 },
  sportsRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  sportPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,107,53,0.16)',
    borderRadius: 8,
  },
  sportTxt: { color: '#FFB07A', fontSize: 10, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 8, marginLeft: spacing.sm },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPass: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionLike: { backgroundColor: ACCENT },
});
