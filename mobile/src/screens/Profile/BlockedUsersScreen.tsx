// Tela de usuários bloqueados — lista e permite desbloquear
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import api from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { confirmAsync } from '../../utils/confirm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BlockedUser {
  id: string;
  name: string;
  avatarUrl?: string;
  blockedAt?: string;
}

export default function BlockedUsersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/users/blocked');
      setBlocked(data || []);
      setError(false);
    } catch {
      setError(true);
      if (!silent) showToast('Erro ao carregar lista', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnblock = async (user: BlockedUser) => {
    // confirmAsync funciona no web (Alert.alert ignora os botões lá)
    const ok = await confirmAsync(
      'Desbloquear usuário?',
      `${user.name} poderá ver seu perfil e interagir com você novamente.`,
      { confirmText: 'Desbloquear' },
    );
    if (!ok) return;
    setUnblocking(user.id);
    try {
      await api.delete(`/users/${user.id}/block`);
      setBlocked((prev) => prev.filter((u) => u.id !== user.id));
      showToast(`${user.name} desbloqueado`, 'success');
    } catch {
      showToast('Erro ao desbloquear', 'error');
    } finally {
      setUnblocking(null);
    }
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userRow}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}

      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
        {item.blockedAt && (
          <Text style={styles.userSub}>
            Bloqueado em {new Date(item.blockedAt).toLocaleDateString('pt-BR')}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.unblockBtn, unblocking === item.id && { opacity: 0.5 }]}
        onPress={() => handleUnblock(item)}
        disabled={unblocking === item.id}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Desbloquear ${item.name}`}
      >
        {unblocking === item.id ? (
          <ActivityIndicator size="small" color="#FF6B35" />
        ) : (
          <Text style={styles.unblockText}>Desbloquear</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={error ? 'cloud-offline-outline' : 'shield-checkmark-outline'}
          size={40}
          color="rgba(255,255,255,0.15)"
        />
      </View>
      <Text style={styles.emptyTitle}>
        {error ? 'Não foi possível carregar' : 'Nenhum usuário bloqueado'}
      </Text>
      <Text style={styles.emptySub}>
        {error ? 'Verifique sua conexão e tente de novo.' : 'Quando você bloquear alguém, aparecerá aqui.'}
      </Text>
      {error && (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => load()}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}
      >
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usuários bloqueados</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {/* Count badge */}
      {blocked.length > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {blocked.length} {blocked.length === 1 ? 'usuário bloqueado' : 'usuários bloqueados'}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            blocked.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor="#FF6B35"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingTop dinâmico via insets no JSX (notch/safe-area)
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },

  // ── Count badge ────────────────────────────────────────────────────────────
  countBadge: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.20)',
    alignSelf: 'flex-start',
  },
  countText: { fontSize: 12, color: '#F87171', fontWeight: '600' },

  // ── List ───────────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 80 },
  listContentEmpty: { flex: 1 },

  // ── User row ───────────────────────────────────────────────────────────────
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,107,53,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  userSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  unblockBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,107,53,0.10)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
    minWidth: 90,
    alignItems: 'center',
  },
  unblockText: { fontSize: 12, fontWeight: '700', color: '#FF6B35' },

  // ── Empty state ────────────────────────────────────────────────────────────
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FF6B35',
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
});
