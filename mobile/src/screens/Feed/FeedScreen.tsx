// Feed de atividades estilo Strava — cards com rota, stats, comentários
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ImageBackground,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image'; // cache em disco + blurhash-ready
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { feedApi, FeedPost } from '../../services/feed.service';
import { useAuthStore } from '../../store/authStore';
import { confirmAsync } from '../../utils/confirm';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { heroImages } from '../../theme/images';
import { showToast } from '../../components/ui/Toast';
import { useHaptic } from '../../hooks/useHaptic';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import Logo from '../../components/Logo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../../navigation/MainTabNavigator';

function formatPace(min: number): string {
  if (!min || !isFinite(min) || min <= 0) return '--:--';
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds < 0) return '0min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (!isFinite(ts)) return '';
  const diff = Date.now() - ts;
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
  running: 'walk', corrida: 'walk',
  cycling: 'bicycle', ciclismo: 'bicycle',
  swimming: 'water', natação: 'water',
  hiking: 'trail-sign', trilha: 'trail-sign',
  gym: 'barbell', academia: 'barbell',
  yoga: 'leaf',
};

interface FeedCardProps {
  post: FeedPost;
  liked: boolean;
  likesCount: number;
  onLike: (id: string, currentlyLiked: boolean) => void;
  onComment: (post: FeedPost) => void;
  onMenu: (post: FeedPost) => void;
}

function FeedCardComponent({ post, liked, likesCount, onLike, onComment, onMenu }: FeedCardProps) {
  const heartScale = useRef(new Animated.Value(1)).current;
  const haptic = useHaptic();
  const reduceMotion = useReduceMotion();

  const handleLike = () => {
    if (!liked) {
      haptic.light(); // feedback tátil ao curtir
      if (!reduceMotion) {
        Animated.sequence([
          Animated.timing(heartScale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
          Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
        ]).start();
      }
    }
    onLike(post.id, liked);
  };

  // Duplo-toque na foto curte (estilo Instagram).
  const lastTap = useRef(0);
  const onPhotoPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300 && !liked) handleLike();
    lastTap.current = now;
  };

  const sportKey = post.sport?.toLowerCase() || 'running';
  const icon = (SPORT_ICONS[sportKey] || 'walk') as any;
  const distanceKm = (post.distanceKm || 0).toFixed(2);

  return (
    <View style={styles.card}>
      {/* Orange gradient accent line — premium marker */}
      <LinearGradient
        colors={['#FF6B35', '#FF4500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardAccentLine}
      />

      <View style={styles.cardBody}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarRingWrap}>
            <Image
              source={(() => {
                const u: any = post.user || {};
                const uri = u.avatarUrl || u.profilePhotos?.[0];
                return uri ? { uri } : require('../../assets/images/default-avatar.png');
              })()}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={`Foto de ${post.user?.name || 'atleta'}`}
            />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.userName}>{post.user?.name || 'Atleta'}</Text>
            <View style={styles.metaRow}>
              <Ionicons name={icon} size={12} color={colors.primary} />
              <Text style={styles.metaText}>
                {post.sport || 'Atividade'} • {timeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            onPress={() => onMenu(post)}
            accessibilityRole="button"
            accessibilityLabel="Opções do post"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.dark.secondaryText} />
          </TouchableOpacity>
        </View>

        {post.caption && <Text style={styles.caption}>{post.caption}</Text>}

        {/* Hero distance with subtle orange glow bg */}
        <LinearGradient
          colors={['rgba(255,107,53,0.10)', 'rgba(10,10,15,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroDistanceBg}
        >
          <View style={styles.heroDistance}>
            <Text style={styles.heroValue}>{distanceKm}</Text>
            <Text style={styles.heroLabel}>km</Text>
          </View>
        </LinearGradient>

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

        {post.photoUrl && (
          <Pressable onPress={onPhotoPress} accessibilityLabel="Foto do treino (toque duas vezes para curtir)">
            <Image
              source={{ uri: post.photoUrl }}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          </Pressable>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleLike}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={22}
                color={liked ? '#F87171' : 'rgba(255,255,255,0.6)'}
              />
            </Animated.View>
            <Text style={[styles.actionLabel, liked && { color: '#F87171' }]}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onComment(post)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="chatbubble-outline" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.actionLabel}>{post.commentsCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            onPress={() => {
              import('react-native').then(({ Share }) => {
                Share.share({ message: `Confira esse treino no Sync! 🔥 ${(post.distanceKm || 0).toFixed(2)}km` });
              });
            }}
          >
            <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

// React.memo — só re-renderiza quando muda o estado de like/contagem do próprio post
const FeedCard = React.memo(
  FeedCardComponent,
  (prev, next) =>
    prev.post.id === next.post.id &&
    prev.liked === next.liked &&
    prev.likesCount === next.likesCount,
);

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [countMap, setCountMap] = useState<Record<string, number>>({});

  const PAGE_SIZE = 20;

  const load = useCallback(async (pg = 1, append = false) => {
    if (pg === 1) { setLoading(true); setLoadError(false); }
    else setLoadingMore(true);
    try {
      const data = await feedApi.list(pg);
      const newPosts = data || [];
      if (append) {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...newPosts.filter((p) => !ids.has(p.id))];
        });
        if (newPosts.length > 0) {
          const ids = newPosts.map((p) => p.id);
          const liked = await feedApi.getLikedIds(ids).catch(() => [] as string[]);
          setLikedMap((prev) => {
            const next = { ...prev };
            ids.forEach((id) => { next[id] = liked.includes(id); });
            return next;
          });
        }
      } else {
        setPosts(newPosts);
        const newCounts: Record<string, number> = {};
        newPosts.forEach((p) => { newCounts[p.id] = p.likesCount || 0; });
        setCountMap(newCounts);
        if (newPosts.length > 0) {
          const ids = newPosts.map((p) => p.id);
          const liked = await feedApi.getLikedIds(ids).catch(() => [] as string[]);
          const newLiked: Record<string, boolean> = {};
          ids.forEach((id) => { newLiked[id] = liked.includes(id); });
          setLikedMap(newLiked);
        }
      }
      setHasMore(newPosts.length === PAGE_SIZE);
      setPage(pg);
    } catch {
      setLoadError(true);
      if (!append) setPosts([]);
      // Para o infinite-scroll: sem isso, onEndReached refazia a mesma página
      // em loop infinito quando a rede falha (martelando o servidor).
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  // Recarrega ao focar a aba — assim um treino recém-publicado aparece na hora
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) { firstFocus.current = false; return; }
      load(1);
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore && !loading) {
      load(page + 1, true);
    }
  };

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    setLikedMap((prev) => ({ ...prev, [postId]: !currentlyLiked }));
    setCountMap((prev) => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] ?? 0) + (currentlyLiked ? -1 : 1)),
    }));
    // Tenta de novo num blip de rede antes de reverter — não perde a curtida.
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        if (currentlyLiked) await feedApi.unlike(postId);
        else await feedApi.like(postId);
        ok = true;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!ok) {
      setLikedMap((prev) => ({ ...prev, [postId]: currentlyLiked }));
      setCountMap((prev) => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] ?? 0) + (currentlyLiked ? 1 : -1)),
      }));
      showToast('Erro ao curtir', 'error');
    }
  };

  const handleComment = (post: FeedPost) => {
    navigation.navigate('Comments', { postId: post.id, postAuthorName: post.user?.name || 'Atleta' });
  };

  const handleMenu = async (post: FeedPost) => {
    const isOwn = currentUser?.id && post.user_id === currentUser.id;
    if (isOwn) {
      const ok = await confirmAsync('Apagar publicação?', 'Esta ação não pode ser desfeita.', {
        confirmText: 'Apagar', destructive: true,
      });
      if (!ok) return;
      try {
        await feedApi.remove(post.id);
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        showToast('Publicação removida', 'success');
      } catch {
        showToast('Erro ao remover', 'error');
      }
    } else {
      const ok = await confirmAsync('Denunciar publicação?', `Reportar o post de ${post.user?.name || 'usuário'}?`, {
        confirmText: 'Denunciar', destructive: true,
      });
      if (ok) showToast('Denúncia enviada. Obrigado!', 'success');
    }
  };

  const ListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>Carregando mais...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Hero header — mesmo padrão das telas de auth */}
      <ImageBackground
        source={{ uri: heroImages.cityGroup }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 12, 56) }]}
        resizeMode="cover"
        fadeDuration={300}
      >
        <LinearGradient
          colors={['rgba(10,10,15,0.55)', 'rgba(10,10,15,0.97)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo size={32} variant="filled" />
            <Text style={styles.title}>Feed</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={() => navigation.navigate('UserSearch')}
            >
              <Ionicons name="search-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <FeedCard
              post={item}
              liked={likedMap[item.id] ?? false}
              likesCount={countMap[item.id] ?? item.likesCount ?? 0}
              onLike={handleLike}
              onComment={handleComment}
              onMenu={handleMenu}
            />
          )}
          extraData={{ likedMap, countMap }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<ListFooter />}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.md }}
          removeClippedSubviews={true}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={9}
          ListEmptyComponent={
            loadError ? (
              <View style={styles.empty}>
                <Ionicons name="cloud-offline-outline" size={64} color={colors.dark.secondaryText} />
                <Text style={styles.emptyTitle}>Erro ao carregar</Text>
                <Text style={styles.emptyText}>Verifique sua conexão e tente de novo.</Text>
                <TouchableOpacity
                  style={styles.feedRetryBtn}
                  onPress={() => load(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar novamente"
                >
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.feedRetryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="newspaper-outline" size={40} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Feed vazio</Text>
                <Text style={styles.emptyText}>
                  Complete um treino e poste aqui para ver seu feed.
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F' },

  // ── Hero header ──────────────────────────────────────────────────────────
  header: {
    paddingBottom: spacing.lg,
    overflow: 'hidden',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  headerRight: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  cardAccentLine: {
    height: 2.5,
    width: '100%',
  },
  cardBody: {
    padding: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatarRingWrap: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,107,53,0.4)',
    padding: 1,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  userName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { color: colors.dark.secondaryText, fontSize: 12 },
  caption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  // ── Hero distance ─────────────────────────────────────────────────────────
  heroDistanceBg: {
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroDistance: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  heroValue: {
    fontSize: 56,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 58,
  },
  heroLabel: { fontSize: 18, color: colors.primary, fontWeight: '700', marginBottom: 8 },

  // ── Stats row ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },

  // ── Empty ─────────────────────────────────────────────────────────────────
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: spacing.xl },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,107,53,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.dark.secondaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 22,
  },
  feedRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FF6B35',
  },
  feedRetryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.lg,
  },
  footerText: { color: colors.dark.secondaryText, fontSize: 13 },
});
