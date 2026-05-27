import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  Easing,
  Vibration,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { DiscoveryUser } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SwipeCard from '../../components/cards/SwipeCard';
import { fetchCurrentWeather, WeatherData, getExerciseRecommendation, getRandomQuote, MotivationalQuote } from '../../services/external-apis';
import { getCurrentLocation } from '../../services/location.service';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import StoriesBar from '../../components/StoriesBar';
import { matchingApi } from '../../services/matching.service';
import StoryViewerScreen from '../Stories/StoryViewerScreen';
import CreateStoryScreen from '../Stories/CreateStoryScreen';
import type { Story } from '../../services/stories.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Discovery'>;
};

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100];
const LEVEL_OPTIONS = [
  { id: 'all', label: 'Todos' },
  { id: 'beginner', label: 'Iniciante' },
  { id: 'intermediate', label: 'Intermediario' },
  { id: 'advanced', label: 'Avancado' },
];

const SPORT_FILTER_OPTIONS = [
  { id: 'all', label: 'Todos', icon: 'apps-outline' as const },
  { id: 'running', label: 'Corrida', icon: 'walk-outline' as const },
  { id: 'cycling', label: 'Ciclismo', icon: 'bicycle-outline' as const },
  { id: 'gym', label: 'Academia', icon: 'barbell-outline' as const },
  { id: 'football', label: 'Futebol', icon: 'football-outline' as const },
  { id: 'yoga', label: 'Yoga', icon: 'body-outline' as const },
];

export default function DiscoveryScreen({ navigation }: Props) {
  const authUser = useAuthStore((s) => s.user);
  const hasLocation = !!(authUser?.latitude && authUser?.longitude);
  const [users, setUsers] = useState<DiscoveryUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [likesReceivedCount, setLikesReceivedCount] = useState(0);
  const [lastSwipedUser, setLastSwipedUser] = useState<DiscoveryUser | null>(null);
  const [filterDistance, setFilterDistance] = useState(25);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSport, setFilterSport] = useState('all');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [quote, setQuote] = useState<MotivationalQuote | null>(null);
  const [creatingStory, setCreatingStory] = useState(false);
  const [viewingStory, setViewingStory] = useState<{ stories: Story[]; initialIndex: number; markSeen?: (userId: string) => void } | null>(null);
  const [storiesRefreshKey, setStoriesRefreshKey] = useState(0);
  const [deckH, setDeckH] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const emptyPulse = useRef(new Animated.Value(1)).current;
  const matchBadgeScale = useRef(new Animated.Value(0)).current;
  const undoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUsers();
    loadMatchCount();
    loadWeather();
    setQuote(getRandomQuote());
  }, []);

  useEffect(() => {
    if (newMatchCount > 0) {
      Animated.spring(matchBadgeScale, {
        toValue: 1,
        friction: 3,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [newMatchCount]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: any = {
        radiusKm: filterDistance,
      };
      if (filterLevel !== 'all') params.level = filterLevel;
      if (filterSport !== 'all') params.sport = filterSport;
      const { data } = await api.get('/matching/discover', { params });
      setUsers(data);
      setCurrentIndex(0);
    } catch (error) {
      console.log('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMatchCount = async () => {
    try {
      const { data } = await api.get('/matching/new-count');
      setNewMatchCount(data.count || 0);
    } catch (_error) {
      // silently fail
    }
    try {
      const count = await matchingApi.likesReceivedCount();
      setLikesReceivedCount(count);
    } catch {}
  };

  const loadWeather = async () => {
    try {
      const coords = await getCurrentLocation();
      const data = await fetchCurrentWeather(coords.latitude, coords.longitude);
      setWeather(data);
    } catch (e) {
      console.log('Weather error:', e);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right', isSuperLike = false) => {
    const currentUser = users[currentIndex];
    if (!currentUser) return;

    // Haptic feedback
    try { Vibration.vibrate(50); } catch {}

    setLastSwipedUser(currentUser);
    Animated.timing(undoOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-hide undo after 5s
    setTimeout(() => {
      Animated.timing(undoOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setLastSwipedUser(null));
    }, 5000);

    const isLike = direction === 'right';

    Animated.timing(position, {
      toValue: {
        x: direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100,
        y: 0,
      },
      duration: 300,
      useNativeDriver: false,
    }).start(async () => {
      position.setValue({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);

      try {
        const { data } = await api.post('/matching/swipe', {
          targetUserId: currentUser.id,
          isLike,
          isSuperLike,
        });

        if (data.matched) {
          setNewMatchCount((prev) => prev + 1);
          navigation.navigate('MatchScreen', {
            matchId: data.matchId,
            userName: currentUser.name,
            userId: currentUser.id,
          });
        }
      } catch (error) {
        console.log('Swipe error:', error);
      }
    });
  };

  const handleUndo = () => {
    if (currentIndex > 0 && lastSwipedUser) {
      setCurrentIndex((prev) => prev - 1);
      setLastSwipedUser(null);
      Animated.timing(undoOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        handleSwipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        handleSwipe('left');
      } else if (gesture.dy < -SWIPE_THRESHOLD) {
        const user = users[currentIndex];
        if (user) {
          navigation.navigate('UserProfile', { userId: user.id });
        }
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.3, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Empty state pulse animation
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(emptyPulse, {
          toValue: 1.1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(emptyPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  // Profile completion mock
  const profileCompletion = 78;
  const recommendation = weather ? getExerciseRecommendation(weather) : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.dark.accent} />
        <Text style={styles.loadingText}>Buscando pessoas...</Text>
      </View>
    );
  }

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];

  if (!currentUser) {
    startPulse();
    // Caso especial: usuário sem localização cadastrada
    if (!hasLocation) {
      return (
        <View style={styles.center}>
          <Animated.View style={[styles.emptyIconOuter, { transform: [{ scale: emptyPulse }] }]}>
            <LinearGradient
              colors={[colors.dark.accent + '30', colors.dark.accent + '10']}
              style={styles.emptyIconGradient}
            >
              <View style={styles.emptyIcon}>
                <Ionicons name="location-outline" size={44} color={colors.dark.accent} />
              </View>
            </LinearGradient>
          </Animated.View>
          <Text style={styles.emptyTitle}>Complete sua localização</Text>
          <Text style={styles.emptyText}>
            Sem sua localização não conseguimos encontrar atletas próximos.{'\n'}
            Leva menos de 5 segundos.
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={async () => {
              try {
                const coords = await getCurrentLocation();
                await api.put('/users/location', {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                });
                const fresh = await api.get('/users/me');
                useAuthStore.getState().setUser(fresh.data);
                loadUsers();
              } catch (e) {
                console.log('location update failed', e);
              }
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.dark.accent, '#FF5021']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.refreshBtnGradient}
            >
              <Ionicons name="locate" size={18} color={colors.white} />
              <Text style={styles.refreshText}>Ativar localização</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Animated.View style={[styles.emptyIconOuter, { transform: [{ scale: emptyPulse }] }]}>
          <LinearGradient
            colors={[colors.primary + '20', colors.highlight + '10']}
            style={styles.emptyIconGradient}
          >
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={44} color={colors.primary} />
            </View>
          </LinearGradient>
        </Animated.View>
        <Text style={styles.emptyTitle}>Ninguem por perto</Text>
        <Text style={styles.emptyText}>
          Tente expandir o raio de busca ou volte mais tarde.{'\n'}
          Novos perfis aparecem todos os dias!
        </Text>
        {quote && (
          <Text style={styles.quoteEmpty}>"{quote.text}" - {quote.author}</Text>
        )}
        <TouchableOpacity style={styles.refreshBtn} onPress={loadUsers} activeOpacity={0.7}>
          <LinearGradient
            colors={[...colors.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.refreshBtnGradient}
          >
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.refreshText}>Tentar novamente</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.adjustFiltersBtn}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={16} color={colors.primary} />
          <Text style={styles.adjustFiltersText}>Ajustar filtros</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Descobrir</Text>
          {/* Profile completion indicator */}
          <TouchableOpacity style={styles.completionBadge} onPress={() => navigation.getParent()?.navigate('ProfileTab')}>
            <View style={styles.completionBarBg}>
              <View style={[styles.completionBarFill, { width: `${profileCompletion}%` }]} />
            </View>
            <Text style={styles.completionText}>{profileCompletion}%</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          {/* Weather mini badge */}
          {weather && recommendation && (
            <View style={[styles.weatherMini, { borderColor: recommendation.color + '30' }]}>
              <Ionicons name={weather.weatherIcon as any} size={14} color={recommendation.color} />
              <Text style={styles.weatherMiniTemp}>{weather.temperature}°</Text>
            </View>
          )}
          {/* Likes received (Tinder Gold-style) */}
          {likesReceivedCount > 0 && (
            <TouchableOpacity
              style={styles.matchBadgeBtn}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('LikesReceived')}
            >
              <Ionicons name="star" size={20} color="#F59E0B" />
              <View style={[styles.matchBadge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.matchBadgeText}>
                  {likesReceivedCount > 9 ? '9+' : likesReceivedCount}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {/* New matches badge */}
          {newMatchCount > 0 && (
            <TouchableOpacity
              style={styles.matchBadgeBtn}
              activeOpacity={0.7}
              onPress={() => navigation.getParent()?.navigate('ChatTab')}
            >
              <Ionicons name="heart" size={20} color={colors.likeGreen} />
              <Animated.View style={[styles.matchBadge, { transform: [{ scale: matchBadgeScale }] }]}>
                <Text style={styles.matchBadgeText}>
                  {newMatchCount > 9 ? '9+' : newMatchCount}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cards */}
      {/* Stories Bar */}
      <StoriesBar
        key={storiesRefreshKey}
        onAddStory={() => setCreatingStory(true)}
        onOpenStory={(_id, stories, markSeen) => {
          // markSeen will be called when viewer closes so ring turns gray
          setViewingStory({ stories, initialIndex: 0, markSeen });
        }}
      />

      {/* Story Viewer Modal */}
      {viewingStory && (
        <Modal visible animationType="fade" transparent onRequestClose={() => {
          viewingStory.markSeen?.(viewingStory.stories[0]?.user_id || '');
          setViewingStory(null);
        }}>
          <StoryViewerScreen
            initialStories={viewingStory.stories}
            initialIndex={viewingStory.initialIndex}
            onClose={() => {
              viewingStory.markSeen?.(viewingStory.stories[0]?.user_id || '');
              setViewingStory(null);
            }}
          />
        </Modal>
      )}

      {/* Create Story Modal */}
      {creatingStory && (
        <Modal visible animationType="slide" onRequestClose={() => setCreatingStory(false)}>
          <CreateStoryScreen
            onClose={() => setCreatingStory(false)}
            onSuccess={() => {
              setCreatingStory(false);
              setStoriesRefreshKey((k) => k + 1);
            }}
          />
        </Modal>
      )}

      <View
        style={styles.cardsContainer}
        onLayout={(e) => setDeckH(e.nativeEvent.layout.height)}
      >
        {nextUser && (
          <View style={[styles.cardWrapper, { zIndex: 0, transform: [{ scale: 0.95 }] }]}>
            <SwipeCard user={nextUser} cardHeight={deckH > 0 ? deckH - 8 : undefined} />
          </View>
        )}

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.cardWrapper,
            {
              zIndex: 1,
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ],
            },
          ]}
        >
          <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
            <Text style={[styles.overlayText, { color: colors.likeGreen }]}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }]}>
            <Text style={[styles.overlayText, { color: colors.dislikeRed }]}>NOPE</Text>
          </Animated.View>

          <SwipeCard user={currentUser} cardHeight={deckH > 0 ? deckH - 8 : undefined} />
        </Animated.View>
      </View>

      {/* Cards remaining indicator */}
      <View style={styles.remainingRow}>
        <Text style={styles.remainingText}>
          {users.length - currentIndex} perfis restantes
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Animated.View style={{ opacity: undoOpacity }}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.undoBtn]}
            onPress={handleUndo}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo" size={20} color={colors.warning} />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[styles.actionBtn, styles.dislikeBtn]}
          onPress={() => handleSwipe('left')}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={30} color={colors.dislikeRed} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.superBtn]}
          onPress={() => handleSwipe('right', true)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#2E7BFF', '#5B2EFF']}
            style={styles.superBtnGradient}
          >
            <Ionicons name="star" size={24} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.likeBtn]}
          onPress={() => handleSwipe('right')}
          activeOpacity={0.7}
        >
          <Ionicons name="heart" size={28} color={colors.likeGreen} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.profileBtn]}
          onPress={() => {
            const user = users[currentIndex];
            if (user) navigation.navigate('UserProfile', { userId: user.id });
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity
                onPress={() => {
                  setFilterDistance(25);
                  setFilterLevel('all');
                  setFilterSport('all');
                }}
              >
                <Text style={styles.resetText}>Resetar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Distancia maxima</Text>
            <View style={styles.filterChips}>
              {DISTANCE_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.filterChip, filterDistance === d && styles.filterChipActive]}
                  onPress={() => setFilterDistance(d)}
                >
                  <Text style={[styles.filterChipText, filterDistance === d && styles.filterChipTextActive]}>
                    {d} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Nivel</Text>
            <View style={styles.filterChips}>
              {LEVEL_OPTIONS.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.filterChip, filterLevel === l.id && styles.filterChipActive]}
                  onPress={() => setFilterLevel(l.id)}
                >
                  <Text style={[styles.filterChipText, filterLevel === l.id && styles.filterChipTextActive]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Esporte</Text>
            <View style={styles.filterChips}>
              {SPORT_FILTER_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.filterChip, filterSport === s.id && styles.filterChipActive]}
                  onPress={() => setFilterSport(s.id)}
                >
                  <Ionicons
                    name={s.icon}
                    size={14}
                    color={filterSport === s.id ? colors.white : colors.text}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.filterChipText, filterSport === s.id && styles.filterChipTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyFilterBtn}
              onPress={() => {
                setShowFilters(false);
                loadUsers();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[...colors.gradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyFilterGradient}
              >
                <Ionicons name="checkmark" size={20} color={colors.white} />
                <Text style={styles.applyFilterText}>Aplicar filtros</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.closeModalText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.dark.secondaryText,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: '#0F0F1A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.dark.text,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dark.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  completionBarBg: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.border,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  completionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark.accent,
  },
  weatherMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dark.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  weatherMiniTemp: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.text,
  },
  matchBadgeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  matchBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.dislikeRed,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  matchBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: 40,
    zIndex: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  likeOverlay: {
    right: 20,
    borderColor: colors.likeGreen,
  },
  nopeOverlay: {
    left: 20,
    borderColor: colors.dislikeRed,
  },
  overlayText: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    letterSpacing: 2,
  },
  remainingRow: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  remainingText: {
    fontSize: 11,
    color: colors.dark.secondaryText,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 104 : 88,
    paddingTop: spacing.sm,
    gap: spacing.md,
    backgroundColor: '#0F0F1A',
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  undoBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  dislikeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.dislikeRed + '25',
  },
  superBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  superBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 26,
  },
  likeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.likeGreen + '25',
  },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  emptyIconOuter: {
    marginBottom: spacing.md,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.dark.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.dark.secondaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  quoteEmpty: {
    fontSize: fontSize.sm,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
    paddingHorizontal: spacing.lg,
  },
  refreshBtn: {
    marginTop: spacing.xl,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  refreshBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  refreshText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: '700',
  },
  adjustFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  adjustFiltersText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  // Filter modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    paddingTop: spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  resetText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  applyFilterBtn: {
    marginTop: spacing.xl,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  applyFilterGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  applyFilterText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
  closeModalBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  closeModalText: {
    fontSize: fontSize.md,
    color: colors.secondaryText,
    fontWeight: '500',
  },
});
