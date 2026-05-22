// Feed de atividades estilo Strava — cards com rota, stats, fotos, comentários inline
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { feedApi, FeedPost } from '../../services/feed.service';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { showToast } from '../../components/ui/Toast';
import Logo from '../../components/Logo';

function formatPace(min: number): string {
  if (!min || !isFinite(min) || min <= 0) return '--:--';
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

const SPORT_ICONS: Record<string, string> = {
  running: 'walk',
  corrida: 'walk',
  cycling: 'bicycle',
  ciclismo: 'bicycle',
  swimming: 'water',
  natação: 'water',
  hiking: 'trail-sign',
  trilha: 'trail-sign',
  gym: 'barbell',
  academia: 'barbell',
  yoga: 'leaf',
};

function FeedCard({ post, onLike }: { post: FeedPost; onLike: (id: string) => void }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setLikesCount((c) => c + 1);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    onLike(post.id);
  };

  const sportKey = post.sport?.toLowerCase() || 'running';
  const icon = (SPORT_ICONS[sportKey] || 'walk') as any;
  const distanceKm = (post.distanceKm || 0).toFixed(2);

  return (
    <View style={styles.card}>
      {/* Header: avatar + name + time */}
      <View style={styles.cardHeader}>
        <Image
          source={
            post.user?.avatarUrl
              ? { uri: post.user.avatarUrl }
              : require('../../assets/images/default-avatar.png')
          }
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.userName}>{post.user?.name || 'Atleta'}</Text>
          <View style={styles.metaRow}>
            <Ionicons name={icon} size={12} color={colors.dark.secondaryText} />
            <Text style={styles.metaText}>
              {post.sport || 'Atividade'} • {timeAgo(post.createdAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.dark.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {post.caption && <Text style={styles.caption}>{post.caption}</Text>}

      {/* Hero distance */}
      <View style={styles.heroDistance}>
        <Text style={styles.heroValue}>{distanceKm}</Text>
        <Text style={styles.heroLabel}>km</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDuration(post.durationSeconds || 0)}</Text>
          <Text style={styles.statLabel}>Tempo</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatPace(post.avgPace || 0)}</Text>
          <Text style={styles.statLabel}>/km</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{post.calories || 0}</Text>
          <Text style={styles.statLabel}>kcal</Text>
        </View>
      </View>

      {/* Foto */}
      {post.photoUrl && (
        <Image
          source={{ uri: post.photoUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} hitSlop={8}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? '#F87171' : colors.dark.text}
            />
          </Animated.View>
          <Text style={styles.actionLabel}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.dark.text} />
          <Text style={styles.actionLabel}>{post.commentsCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="share-social-outline" size={20} color={colors.dark.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="bookmark-outline" size={20} color={colors.dark.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await feedApi.list(1);
      setPosts(data || []);
    } catch {
      setPosts([]);
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

  const handleLike = async (postId: string) => {
    try {
      await feedApi.like(postId);
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={32} variant="filled" />
          <Text style={styles.title}>Feed</Text>
        </View>
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="notifications-outline" size={22} color={colors.dark.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <FeedCard post={item} onLike={handleLike} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="newspaper-outline" size={64} color={colors.dark.secondaryText} />
              <Text style={styles.emptyTitle}>Feed vazio</Text>
              <Text style={styles.emptyText}>
                Quando você ou seus amigos completarem treinos e postarem aqui, vai aparecer.
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.dark.text },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dark.surface },
  userName: { color: colors.dark.text, fontWeight: '700', fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { color: colors.dark.secondaryText, fontSize: 12 },
  caption: { color: colors.dark.text, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  heroDistance: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginVertical: spacing.md,
    gap: 6,
  },
  heroValue: { fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: -2, lineHeight: 58 },
  heroLabel: { fontSize: 18, color: colors.dark.secondaryText, fontWeight: '700', marginBottom: 8 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.dark.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, color: colors.dark.secondaryText, marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.06)' },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.dark.surface,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { color: colors.dark.text, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.dark.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md },
  emptyText: {
    color: colors.dark.secondaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 14,
  },
});
