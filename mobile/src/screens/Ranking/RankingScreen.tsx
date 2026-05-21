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
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Ranking'>;
};

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function RankingScreen({ navigation }: Props) {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      const { data } = await api.get('/ranking/monthly');
      setRanking(data);
    } catch (error) {
      console.log('Error:', error);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Ranking Mensal</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.dark.accent} style={{ marginTop: 50 }} />
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
              <Ionicons name="trophy-outline" size={48} color={colors.border} />
              <Text style={styles.empty}>Nenhum dado de ranking ainda</Text>
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
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.dark.text,
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
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
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
    backgroundColor: colors.border,
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
