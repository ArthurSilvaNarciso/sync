import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { Achievement, UserXP } from '../../types';
import { achievementsService } from '../../services/achievements.service';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonList } from '../../components/ui/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Achievements'>;
};

export default function AchievementsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [xpData, setXpData] = useState<UserXP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [achievementsData, xp] = await Promise.all([
        achievementsService.getAchievements(),
        achievementsService.getXP(),
      ]);
      setAchievements(achievementsData);
      setXpData(xp);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const isUnlocked = !!item.unlockedAt;
    return (
      <View style={[styles.achievementCard, !isUnlocked && styles.achievementCardLocked]}>
        <View style={[styles.iconWrap, !isUnlocked && styles.iconWrapLocked]}>
          <Text style={[styles.achievementIcon, !isUnlocked && styles.achievementIconLocked]}>
            {item.icon}
          </Text>
        </View>
        <View style={styles.achievementInfo}>
          <Text style={[styles.achievementName, !isUnlocked && styles.lockedText]}>
            {isUnlocked ? item.name : '???'}
          </Text>
          <Text style={[styles.achievementDesc, !isUnlocked && styles.lockedText]}>
            {isUnlocked ? item.description : 'Continue treinando para desbloquear'}
          </Text>
          {isUnlocked && item.unlockedAt && (
            <Text style={styles.unlockedDate}>
              {new Date(item.unlockedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          )}
        </View>
        <View style={styles.xpBadge}>
          {isUnlocked ? (
            <>
              <Text style={styles.xpValue}>+{item.xp}</Text>
              <Text style={styles.xpLabel}>XP</Text>
            </>
          ) : (
            <Ionicons name="lock-closed" size={16} color={colors.dark.secondaryText} />
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top + 12, 56) }]}>
        <SkeletonList count={7} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 12, 56) }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conquistas</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {/* XP Banner */}
      {xpData && (
        <LinearGradient
          colors={['#1A1A35', '#12122A']}
          style={styles.xpBanner}
        >
          <View style={styles.xpLeft}>
            <Text style={styles.xpLevelLabel}>NÍVEL</Text>
            <Text style={styles.xpLevel}>{xpData.level}</Text>
          </View>
          <View style={styles.xpCenter}>
            <Text style={styles.xpTotal}>{xpData.totalXP} XP</Text>
            <View style={styles.xpBar}>
              <View
                style={[
                  styles.xpBarFill,
                  { width: `${((xpData.totalXP % 500) / 500) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.xpNext}>
              {500 - (xpData.totalXP % 500)} XP para o próximo nível
            </Text>
          </View>
          <View style={styles.xpRight}>
            <Text style={styles.xpCountLabel}>CONQUISTAS</Text>
            <Text style={styles.xpCount}>
              {unlockedCount}/{totalCount}
            </Text>
          </View>
        </LinearGradient>
      )}

      <FlatList
        data={achievements}
        keyExtractor={(item) => item.type}
        renderItem={renderAchievement}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          achievements.length > 0 ? (
            <Text style={styles.sectionLabel}>
              {unlockedCount} de {totalCount} conquistas desbloqueadas
            </Text>
          ) : null
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="cloud-offline-outline" size={56} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyTitle}>Erro ao carregar</Text>
              <Text style={styles.emptyText}>Não foi possível buscar suas conquistas.</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadData}
                accessibilityRole="button"
                accessibilityLabel="Tentar novamente"
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="trophy-outline" size={56} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyTitle}>Sem conquistas ainda</Text>
              <Text style={styles.emptyText}>Complete treinos pra desbloquear medalhas e XP.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  emptyWrap: { alignItems: 'center', paddingTop: 70, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.dark.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md },
  emptyText: { color: colors.dark.secondaryText, textAlign: 'center', marginTop: spacing.sm, fontSize: 13, lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: spacing.lg, backgroundColor: '#FF6B35',
    paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: 0.3,
  },
  xpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.20)',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  xpLeft: {
    alignItems: 'center',
    minWidth: 56,
  },
  xpLevelLabel: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    fontWeight: '600',
    letterSpacing: 1,
  },
  xpLevel: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.dark.accent,
  },
  xpCenter: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  xpTotal: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  xpBar: {
    height: 6,
    backgroundColor: colors.dark.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.dark.accent,
    borderRadius: 3,
  },
  xpNext: {
    fontSize: 11,
    color: colors.dark.secondaryText,
  },
  xpRight: {
    alignItems: 'center',
    minWidth: 64,
  },
  xpCountLabel: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    fontWeight: '600',
    letterSpacing: 1,
  },
  xpCount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.dark.text,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  achievementCardLocked: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapLocked: {
    backgroundColor: colors.dark.border,
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementIconLocked: {
    opacity: 0.3,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.dark.text,
  },
  achievementDesc: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    marginTop: 2,
  },
  lockedText: {
    color: colors.dark.secondaryText,
  },
  unlockedDate: {
    fontSize: 10,
    color: colors.dark.accent,
    marginTop: 4,
    fontWeight: '500',
  },
  xpBadge: {
    alignItems: 'center',
    minWidth: 40,
  },
  xpValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.dark.accent,
  },
  xpLabel: {
    fontSize: 10,
    color: colors.dark.secondaryText,
  },
});
