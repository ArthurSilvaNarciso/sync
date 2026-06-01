import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { RankingItem } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonList } from '../../components/ui/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Ranking'>;
};

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

type Scope = 'monthly' | 'weekly' | 'friends';

const SCOPES: { id: Scope; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'monthly', label: 'Mensal', icon: 'calendar' },
  { id: 'weekly', label: 'Semanal', icon: 'flame' },
  { id: 'friends', label: 'Amigos', icon: 'people' },
];

export default function RankingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('monthly');

  useEffect(() => {
    loadRanking();
  }, [scope]);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const endpoint =
        scope === 'monthly' ? '/ranking/monthly'
        : scope === 'weekly' ? '/ranking/weekly'
        : '/ranking/friends';
      const { data } = await api.get(endpoint);
      setRanking(data);
    } catch (error) {
      console.log('Error:', error);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  const renderTop3 = () => {
    const top3 = ranking.slice(0, 3);
    if (top3.length === 0) return null;

    // Reorder: 2nd, 1st, 3rd
    const ordered = top3.length >= 3
      ? [top3[1], top3[0], top3[2]]
      : top3;

    return (
      <LinearGradient
        colors={[...colors.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.podiumGradient}
      >
        <View style={styles.podium}>
          {ordered.map((item, index) => {
            const isFirst = index === 1;
            const position = isFirst ? 1 : index === 0 ? 2 : 3;
            return (
              <View
                key={item.userId}
                style={[styles.podiumItem, isFirst && styles.podiumFirst]}
              >
                <View style={[styles.medal, { backgroundColor: medalColors[position - 1] }]}>
                  <Text style={styles.medalText}>{position}</Text>
                </View>
                <Image
                  source={
                    item.avatarUrl
                      ? { uri: item.avatarUrl }
                      : require('../../assets/images/default-avatar.png')
                  }
                  style={[
                    styles.podiumAvatar,
                    isFirst && styles.podiumAvatarFirst,
                  ]}
                />
                <Text style={styles.podiumName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.podiumDistance}>
                  {item.totalDistanceKm} km
                </Text>
                <Text style={styles.podiumActivities}>
                  {item.totalActivities} ativ.
                </Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>
    );
  };

  const renderItem = ({ item }: { item: RankingItem }) => (
    <View style={styles.listItem}>
      <Text style={styles.listPosition}>{item.position}</Text>
      <Image
        source={
          item.avatarUrl
            ? { uri: item.avatarUrl }
            : require('../../assets/images/default-avatar.png')
        }
        style={styles.listAvatar}
      />
      <View style={styles.listInfo}>
        <Text style={styles.listName}>{item.name}</Text>
        <Text style={styles.listMeta}>{item.totalActivities} atividades</Text>
      </View>
      <View style={styles.listDistanceWrap}>
        <Text style={styles.listDistance}>{item.totalDistanceKm}</Text>
        <Text style={styles.listDistanceUnit}>km</Text>
      </View>
    </View>
  );

  const scopeLabel = scope === 'monthly' ? 'Mensal' : scope === 'weekly' ? 'Semanal' : 'Entre Amigos';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 12, 56) }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Ranking {scopeLabel}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Scope tabs */}
      <View style={styles.tabs}>
        {SCOPES.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.tab, scope === s.id && styles.tabActive]}
            onPress={() => setScope(s.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={s.icon}
              size={14}
              color={scope === s.id ? '#fff' : colors.dark.secondaryText}
            />
            <Text style={[styles.tabText, scope === s.id && styles.tabTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <SkeletonList count={8} />
      ) : (
        <FlatList
          data={ranking.slice(3)}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          ListHeaderComponent={renderTop3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.20)" />
              <Text style={styles.empty}>
                {scope === 'friends'
                  ? 'Você ainda não tem amigos no app. Vá pro Descobrir!'
                  : 'Nenhum dado de ranking ainda'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  tabActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.secondaryText,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  podiumGradient: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  podiumFirst: {
    marginBottom: spacing.md,
  },
  medal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    elevation: 3,
  },
  medalText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  podiumAvatarFirst: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  podiumName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.white,
    marginTop: spacing.xs,
  },
  podiumDistance: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
  podiumActivities: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  listPosition: {
    width: 28,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.dark.secondaryText,
    textAlign: 'center',
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginLeft: spacing.sm,
  },
  listInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.dark.text,
  },
  listMeta: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    marginTop: 2,
  },
  listDistanceWrap: {
    alignItems: 'flex-end',
  },
  listDistance: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.dark.accent,
  },
  listDistanceUnit: {
    fontSize: 10,
    color: colors.dark.secondaryText,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  empty: {
    textAlign: 'center',
    color: colors.dark.secondaryText,
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
});
