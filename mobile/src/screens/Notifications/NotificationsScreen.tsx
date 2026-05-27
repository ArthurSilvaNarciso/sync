// Tela de notificações in-app — kudos, comentários, matches, mensagens
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
import { colors, fontSize, spacing } from '../../theme';
import api from '../../services/api';
import { showToast } from '../../components/ui/Toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  data?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  new_match: { icon: 'heart', color: '#F87171' },
  new_message: { icon: 'chatbubble', color: '#3B82F6' },
  event_reminder: { icon: 'calendar', color: '#FCD34D' },
  achievement_unlocked: { icon: 'trophy', color: '#A78BFA' },
  like_received: { icon: 'thumbs-up', color: '#10B981' },
  comment: { icon: 'chatbox', color: '#3B82F6' },
  kudos: { icon: 'flame', color: '#FF6B35' },
  story: { icon: 'aperture', color: '#EC4899' },
  flash_event: { icon: 'flash', color: '#FF6B35' },
  hydration: { icon: 'water', color: '#3B82F6' },
  training_daily: { icon: 'sunny', color: '#FCD34D' },
  default: { icon: 'notifications', color: '#8E8EA0' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function NotificationsScreen({ navigation }: any) {
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setList(data || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    setList((l) => l.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    api.put(`/notifications/${id}/read`).catch(() => {});
  };

  const markAllAsRead = async () => {
    const unread = list.filter((n) => !n.isRead);
    setList((l) => l.map((n) => ({ ...n, isRead: true })));
    await Promise.all(unread.map((n) => api.put(`/notifications/${n.id}/read`).catch(() => {})));
    showToast('Todas marcadas como lidas', 'success');
  };

  const unreadCount = list.filter((n) => !n.isRead).length;

  const renderItem = ({ item }: { item: Notification }) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.default;
    return (
      <TouchableOpacity
        style={[styles.notification, !item.isRead && styles.unread]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: cfg.color + '22' }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifContent} numberOfLines={2}>{item.content}</Text>
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.title}>Notificações</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>{unreadCount} não lidas</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.markAllBtn}
          >
            <Text style={styles.markAll}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <FlatList
        data={list}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={64} color={colors.dark.secondaryText} />
              <Text style={styles.emptyTitle}>Sem notificações</Text>
              <Text style={styles.emptyText}>
                Quando você receber kudos, comentários ou matches, aparecerá aqui.
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
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.dark.text },
  subtitle: { fontSize: 12, color: '#FF6B35', fontWeight: '700', marginTop: 2 },
  markAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
  },
  markAll: { color: '#FF6B35', fontSize: 12, fontWeight: '700' },
  notification: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  unread: {
    backgroundColor: 'rgba(255,107,53,0.04)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  notifTitle: { color: colors.dark.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  notifContent: { color: colors.dark.secondaryText, fontSize: 13, lineHeight: 18 },
  notifTime: { color: colors.dark.secondaryText, fontSize: 11, marginTop: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.dark.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md },
  emptyText: {
    color: colors.dark.secondaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 20,
  },
});
