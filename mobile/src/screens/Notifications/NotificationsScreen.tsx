import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { AppNotification } from '../../types';
import { useNotificationStore } from '../../store/notificationStore';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Notifications'>;
};

// --- Helpers ---

type NotificationType =
  | 'new_match'
  | 'new_message'
  | 'event_reminder'
  | 'event_joined'
  | 'achievement_unlocked'
  | 'like_received'
  | 'super_like_received'
  | 'weekly_summary'
  | 'streak_warning'
  | 'event_starting_soon'
  | 'new_event_nearby';

const TYPE_COLORS: Record<string, string> = {
  new_match: '#4ADE80',
  new_message: '#2E7BFF',
  event_reminder: '#FAAD14',
  event_joined: '#2E7BFF',
  achievement_unlocked: '#8B5CFF',
  like_received: '#F87171',
  super_like_received: '#FAAD14',
  weekly_summary: '#2E7BFF',
  streak_warning: '#F87171',
  event_starting_soon: '#FAAD14',
  new_event_nearby: '#4ADE80',
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  new_match: 'heart',
  new_message: 'chatbubble',
  event_reminder: 'calendar',
  event_joined: 'people',
  achievement_unlocked: 'trophy',
  like_received: 'heart-outline',
  super_like_received: 'star',
  weekly_summary: 'bar-chart',
  streak_warning: 'flame',
  event_starting_soon: 'time',
  new_event_nearby: 'location',
};

const DEFAULT_COLOR = '#B8B8D1';
const DEFAULT_ICON: keyof typeof Ionicons.glyphMap = 'notifications';

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? DEFAULT_COLOR;
}

function getTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  return TYPE_ICONS[type] ?? DEFAULT_ICON;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min atr\u00e1s`;
  if (diffHours < 24) return `${diffHours}h atr\u00e1s`;
  if (diffDays < 7) return `${diffDays}d atr\u00e1s`;
  return date.toLocaleDateString('pt-BR');
}

function getDateGroup(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  if (date >= todayStart) return 'Hoje';
  if (date >= yesterdayStart) return 'Ontem';
  if (date >= weekStart) return 'Esta semana';
  return 'Anteriores';
}

interface NotificationGroup {
  title: string;
  data: AppNotification[];
}

function groupNotifications(notifications: AppNotification[]): NotificationGroup[] {
  const order = ['Hoje', 'Ontem', 'Esta semana', 'Anteriores'];
  const groups: Record<string, AppNotification[]> = {};

  for (const n of notifications) {
    const group = getDateGroup(n.createdAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  }

  return order
    .filter(key => groups[key] && groups[key].length > 0)
    .map(key => ({ title: key, data: groups[key] }));
}

// --- Skeleton ---

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '90%', marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '30%', marginTop: 8 }]} />
      </View>
    </View>
  );
}

// --- Main ---

export default function NotificationsScreen({ navigation }: Props) {
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
  } = useNotificationStore();

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback(
    (notification: AppNotification) => {
      if (!notification.isRead) {
        markAsRead(notification.id);
      }
    },
    [markAsRead],
  );

  const groups = groupNotifications(notifications);

  // Build a flat list with section headers
  const flatData: Array<{ type: 'header'; title: string } | { type: 'item'; notification: AppNotification }> = [];
  for (const group of groups) {
    flatData.push({ type: 'header', title: group.title });
    for (const n of group.data) {
      flatData.push({ type: 'item', notification: n });
    }
  }

  const renderItem = ({ item }: { item: (typeof flatData)[number] }) => {
    if (item.type === 'header') {
      return (
        <Text style={styles.sectionHeader}>{item.title}</Text>
      );
    }

    const n = item.notification;
    const typeColor = getTypeColor(n.type);
    const typeIcon = getTypeIcon(n.type);

    return (
      <TouchableOpacity
        style={[styles.card, !n.isRead && styles.cardUnread]}
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(n)}
      >
        <View style={[styles.leftBorder, { backgroundColor: typeColor }]} />

        <View style={[styles.iconWrap, { backgroundColor: typeColor + '18' }]}>
          <Ionicons name={typeIcon} size={20} color={typeColor} />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={styles.cardBody} numberOfLines={2}>
            {n.body}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(n.createdAt)}</Text>
        </View>

        {!n.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Loading state
  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifica\u00e7\u00f5es</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.skeletonWrap}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifica\u00e7\u00f5es</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(item, index) =>
          item.type === 'header' ? `header-${item.title}` : `item-${item.notification.id}`
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          flatData.length === 0 ? styles.emptyListContainer : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={56} color={colors.border} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma notifica\u00e7\u00e3o</Text>
            <Text style={styles.emptySubtitle}>
              Quando voc\u00ea receber notifica\u00e7\u00f5es, elas aparecer\u00e3o aqui.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  markAllBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  markAllText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary + '30',
  },
  leftBorder: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  cardContent: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  cardBody: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: 2,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: spacing.xs,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.blueAccent,
    marginRight: spacing.md,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.border + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  // Skeleton
  skeletonWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border + '40',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border + '40',
  },
});
