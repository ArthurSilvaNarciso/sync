import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { SPORTS, SportLevel } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { heroImages, getSportImage } from '../../theme/images';
import StreakBadge from '../../components/StreakBadge';
import * as ImagePicker from 'expo-image-picker';
import { fetchCurrentWeather, WeatherData, getExerciseRecommendation, getRandomQuote, MotivationalQuote } from '../../services/external-apis';
import { getCurrentLocation } from '../../services/location.service';
import api from '../../services/api';
import { uploadMedia } from '../../services/media.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../../navigation/MainTabNavigator';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'MyProfile'>;
};

const levelLabels: Record<SportLevel, string> = {
  [SportLevel.BEGINNER]: 'Iniciante',
  [SportLevel.INTERMEDIATE]: 'Intermediario',
  [SportLevel.ADVANCED]: 'Avancado',
};

const levelIcons: Record<SportLevel, string> = {
  [SportLevel.BEGINNER]: 'leaf',
  [SportLevel.INTERMEDIATE]: 'flame',
  [SportLevel.ADVANCED]: 'trophy',
};

interface Stats {
  totalActivities: number;
  totalDistanceKm: number;
  weeklyDistanceKm: number;
  totalDuration: number;
  currentStreak: number;
  bestStreak: number;
  averagePace: number;
  averageSpeed: number;
  totalMatches: number;
  totalEvents: number;
}

export default function MyProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalActivities: 0, totalDistanceKm: 0, weeklyDistanceKm: 0, totalDuration: 0,
    currentStreak: 0, bestStreak: 0,
    averagePace: 0, averageSpeed: 0,
    totalMatches: 0, totalEvents: 0,
  });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [quote, setQuote] = useState<MotivationalQuote | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadStats(() => mounted);
    loadWeather(() => mounted);
    setQuote(getRandomQuote());
    return () => { mounted = false; };
  }, []);

  // isMounted() guard evita setState em componente desmontado (warning React)
  const loadStats = async (isMounted: () => boolean = () => true) => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/stats');
      const weeklyKm = data.weeklyDistance ?? data.weeklyDistanceKm ?? 0;
      if (!isMounted()) return;
      setStats({
        totalActivities: data.totalActivities || 0,
        totalDistanceKm: data.totalDistance || 0,
        weeklyDistanceKm: weeklyKm,
        totalDuration: (data.totalDuration || 0) * 3600,
        currentStreak: data.currentStreak || 0,
        bestStreak: data.bestStreak || 0,
        averagePace: data.averagePace || 0,
        averageSpeed: data.averageSpeed || 0,
        totalMatches: data.totalMatches || 0,
        totalEvents: data.totalEvents || 0,
      });
    } catch {
      try {
        const { data } = await api.get('/activities/history');
        const activities = Array.isArray(data) ? data : [];
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        weekStart.setHours(0, 0, 0, 0);
        const weeklyActivities = activities.filter((a: any) => {
          const d = new Date(a.createdAt || a.startTime || 0);
          return d >= weekStart;
        });
        const totalDistance = activities.reduce((sum: number, a: any) => sum + (a.distance || 0), 0);
        const weeklyDistance = weeklyActivities.reduce((sum: number, a: any) => sum + (a.distance || 0), 0);
        const totalDuration = activities.reduce((sum: number, a: any) => sum + (a.duration || 0), 0);
        if (!isMounted()) return;
        setStats((s) => ({
          ...s,
          totalActivities: activities.length,
          totalDistanceKm: totalDistance / 1000,
          weeklyDistanceKm: weeklyDistance / 1000,
          totalDuration,
        }));
      } catch {
        // sem stats
      }
    } finally {
      if (isMounted()) setStatsLoading(false);
    }
  };

  const loadWeather = async (isMounted: () => boolean = () => true) => {
    try {
      const coords = await getCurrentLocation();
      const data = await fetchCurrentWeather(coords.latitude, coords.longitude);
      if (isMounted()) setWeather(data);
    } catch {
      // sem dados de clima
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadWeather()]);
    setQuote(getRandomQuote());
    setRefreshing(false);
  };

  const handleShareProfile = async () => {
    if (!user) return;
    try {
      await Share.share({
        message: `Confira meu perfil no Sync! Me encontre la: ${user.name} - Sync App`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const pickBanner = async () => {
    if (uploadingBanner) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para escolher o banner.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingBanner(true);
      // Upload do arquivo → URL (não mais base64 no banco)
      const { url } = await uploadMedia(asset.uri, {
        name: `banner-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      const { data } = await api.post('/users/me/banner', { bannerBase64: url });
      setUser(data);
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.message || 'Não foi possível enviar o banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  if (!user) return null;

  const recommendation = weather ? getExerciseRecommendation(weather) : null;

  // Array estático de navegação (não memoizado: vem após early return de !user)
  const menuItems = [
    {
      icon: 'create-outline' as const,
      label: 'Editar perfil',
      subtitle: 'Alterar foto, bio e dados',
      onPress: () => navigation.navigate('EditProfile'),
      color: colors.primary,
    },
    {
      icon: 'medal-outline' as const,
      label: 'Conquistas',
      subtitle: 'Suas medalhas e XP acumulado',
      onPress: () => navigation.navigate('Achievements'),
      color: '#8B5CFF',
    },
    {
      icon: 'bar-chart-outline' as const,
      label: 'Dashboard de Stats',
      subtitle: 'Semana / mês / ano com gráficos',
      onPress: () => navigation.navigate('StatsDashboard' as any),
      color: colors.dark.accent,
    },
    {
      icon: 'fitness-outline' as const,
      label: 'Planos de treino',
      subtitle: '5K / 10K / 21K com cronograma',
      onPress: () => navigation.navigate('Training' as any),
      color: '#10B981',
    },
    {
      icon: 'trophy-outline' as const,
      label: 'Ranking mensal',
      subtitle: 'Veja sua posicao no ranking',
      onPress: () => navigation.navigate('Ranking'),
      color: '#FFD700',
    },
    {
      icon: 'notifications-outline' as const,
      label: 'Notificacoes',
      subtitle: 'Matches, mensagens e eventos',
      onPress: () => navigation.navigate('Notifications'),
      color: colors.blueAccent,
    },
    {
      icon: 'share-social-outline' as const,
      label: 'Compartilhar perfil',
      subtitle: 'Convide amigos para o Sync',
      onPress: handleShareProfile,
      color: colors.success,
    },
    {
      icon: 'settings-outline' as const,
      label: 'Configuracoes',
      subtitle: 'Privacidade, notificacoes, conta',
      onPress: () => navigation.navigate('Settings'),
      color: colors.secondaryText,
    },
  ];

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.white}
        />
      }
    >
      {/* Profile header with hero cover */}
      <ImageBackground
        source={
          user.bannerUrl
            ? { uri: user.bannerUrl }
            : { uri: user.sports?.[0] ? getSportImage(user.sports[0]) : heroImages.runnerSunrise }
        }
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top + 12, 60) }]}
        resizeMode="cover"
        fadeDuration={300}
      >
        <LinearGradient
          colors={['rgba(10,10,15,0.15)', 'rgba(10,10,15,0.65)', 'rgba(10,10,15,0.97)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Banner edit button */}
        <TouchableOpacity
          style={[styles.bannerEditBtn, { top: Math.max(insets.top + 12, 56) }]}
          onPress={pickBanner}
          disabled={uploadingBanner}
          accessibilityRole="button"
          accessibilityLabel="Alterar foto de capa"
        >
          <Ionicons name={uploadingBanner ? 'hourglass-outline' : 'image-outline'} size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                user.avatarUrl
                  ? { uri: user.avatarUrl }
                  : user.profilePhotos && user.profilePhotos.length > 0
                  ? { uri: user.profilePhotos[0] }
                  : require('../../assets/images/default-avatar.png')
              }
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => navigation.navigate('EditProfile')}
              accessibilityRole="button"
              accessibilityLabel="Alterar foto de perfil"
            >
              <Ionicons name="camera" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            {(user as any).isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={11} color="#fff" />
              </View>
            )}
            {(user as any).subscriptionTier === 'atleta_pro' && (
              <View style={[styles.tierBadge, { backgroundColor: '#7C3AED' }]}>
                <Ionicons name="trophy" size={10} color="#fff" />
              </View>
            )}
            {(user as any).subscriptionTier === 'premium' && (
              <View style={[styles.tierBadge, { backgroundColor: '#FF6B35' }]}>
                <Ionicons name="star" size={10} color="#fff" />
              </View>
            )}
          </View>
          {user.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.city}>{user.city}</Text>
            </View>
          )}
          {user.level && (levelIcons[user.level] || levelLabels[user.level]) && (
            <View style={styles.levelBadge}>
              <Ionicons
                name={(levelIcons[user.level] || 'fitness') as any}
                size={14}
                color={colors.white}
              />
              <Text style={styles.levelText}>{levelLabels[user.level] || user.level}</Text>
            </View>
          )}
        </View>
      </ImageBackground>

      {/* Streak badge (killer: dias consecutivos) */}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: -spacing.md, marginBottom: spacing.md }}>
        <StreakBadge days={stats.currentStreak} bestDays={stats.bestStreak} />
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="flash" size={18} color={colors.primary} />
          <Text style={styles.statValue}>{stats.totalActivities}</Text>
          <Text style={styles.statLabel}>Atividades</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="navigate" size={18} color={colors.blueAccent} />
          <Text style={styles.statValue}>{stats.totalDistanceKm.toFixed(1)}</Text>
          <Text style={styles.statLabel}>km total</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={18} color={colors.highlight} />
          <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
          <Text style={styles.statLabel}>Tempo</Text>
        </View>
      </View>

      {/* Stats row 2: Pace + Speed + Matches */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="speedometer" size={18} color="#4ADE80" />
          <Text style={styles.statValue}>
            {stats.averagePace > 0 ? `${Math.floor(stats.averagePace)}:${String(Math.round((stats.averagePace % 1) * 60)).padStart(2, '0')}` : '--'}
          </Text>
          <Text style={styles.statLabel}>min/km</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={18} color="#8B5CFF" />
          <Text style={styles.statValue}>{stats.totalMatches}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={18} color="#2E7BFF" />
          <Text style={styles.statValue}>{stats.totalEvents}</Text>
          <Text style={styles.statLabel}>Eventos</Text>
        </View>
      </View>

      {/* Bio */}
      {user.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          <Text style={styles.bio}>{user.bio}</Text>
        </View>
      )}

      {/* Sports */}
      {user.sports && user.sports.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Esportes</Text>
          <View style={styles.tags}>
            {user.sports.map((s) => (
              <View key={s} style={styles.tag}>
                <Text style={styles.tagText}>
                  {SPORTS.find((sp) => sp.id === s)?.label || s}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Daily Challenges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Desafios do dia</Text>
        <View style={styles.challengesCard}>
          {[
            {
              icon: 'walk-outline' as const,
              label: 'Registre 1 treino hoje',
              progress: stats.totalActivities > 0 ? 1 : 0,
              total: 1,
              color: '#FF6B35',
            },
            {
              icon: 'navigate-outline' as const,
              label: 'Corra 5km esta semana',
              progress: Math.min(stats.weeklyDistanceKm, 5),
              total: 5,
              unit: 'km',
              color: '#2E7BFF',
            },
            {
              icon: 'calendar-outline' as const,
              label: 'Participe de 1 evento',
              progress: 0,
              total: 1,
              color: '#8B5CFF',
            },
          ].map((c, i) => {
            const pct = Math.min(1, c.progress / c.total);
            const done = pct >= 1;
            return (
              <View key={i} style={[styles.challengeItem, i < 2 && styles.challengeDivider]}>
                <View style={[styles.challengeIcon, { backgroundColor: c.color + '18' }]}>
                  <Ionicons name={done ? 'checkmark-circle' : c.icon} size={18} color={done ? colors.success : c.color} />
                </View>
                <View style={styles.challengeContent}>
                  <Text style={[styles.challengeLabel, done && styles.challengeLabelDone]}>{c.label}</Text>
                  <View style={styles.challengeBarWrap}>
                    <View style={styles.challengeBar}>
                      <View style={[styles.challengeBarFill, { width: `${pct * 100}%`, backgroundColor: done ? colors.success : c.color }]} />
                    </View>
                    <Text style={[styles.challengeProgress, { color: done ? colors.success : c.color }]}>
                      {c.unit ? `${c.progress.toFixed(1)}/${c.total}${c.unit}` : `${Math.round(c.progress)}/${c.total}`}
                    </Text>
                  </View>
                </View>
                {done && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
              </View>
            );
          })}
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: item.color + '12' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: TAB_BAR_HEIGHT + insets.bottom + spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingBottom: spacing.xl + 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerEditBtn: {
    position: 'absolute',
    top: 56, // overridden dynamically with insets.top
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
  },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center',
  },
  tierBadge: {
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  city: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  levelText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.065)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px)' } as any) : {}),
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  // Weather card
  weatherCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weatherCardInfo: {
    flex: 1,
  },
  weatherCardTemp: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  weatherCardRec: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 1,
  },
  weatherScore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherScoreText: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  // Quote card
  quoteCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '25',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  quoteAuthor: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.primary + '12',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  menu: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  challengesCard: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  challengeDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeContent: {
    flex: 1,
  },
  challengeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  challengeLabelDone: {
    textDecorationLine: 'line-through',
    color: colors.secondaryText,
  },
  challengeBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  challengeBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  challengeProgress: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextWrap: {
    flex: 1,
    marginLeft: spacing.md,
  },
  menuLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: 2,
  },
});
