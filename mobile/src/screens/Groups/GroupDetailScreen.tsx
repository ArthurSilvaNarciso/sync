// Detalhe do grupo: header, total de km (soma dos membros), entrar/sair,
// e lista de membros rankeada por km contribuído.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image'; // recorta avatar no círculo (web + nativo)
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { groupsApi, GroupSummary } from '../../services/groups.service';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../components/ui/Toast';
import { confirmAsync } from '../../utils/confirm';

interface Member {
  id: string;
  role: 'admin' | 'member';
  contributedKm: number;
  contributedActivities?: number;
  user: { id: string; name: string; avatarUrl?: string; city?: string } | null;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function GroupDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = route.params as { groupId: string; groupName?: string };
  const currentUser = useAuthStore((s) => s.user);

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [g, m] = await Promise.all([
        groupsApi.detail(groupId).catch(() => null),
        groupsApi.members(groupId).catch(() => []),
      ]);
      if (g) setGroup(g);
      setMembers((m as Member[]) || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const isMember = members.some((m) => m.user?.id === currentUser?.id);

  const handleJoin = async () => {
    setBusy(true);
    try {
      await groupsApi.join(groupId);
      showToast('Você entrou no grupo! 🎉', 'success');
      await load(true);
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Não foi possível entrar', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    const ok = await confirmAsync('Sair do grupo?', 'Seus km contribuídos permanecem no histórico do grupo.', {
      confirmText: 'Sair', destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await groupsApi.leave(groupId);
      showToast('Você saiu do grupo', 'info');
      await load(true);
    } catch {
      showToast('Erro ao sair', 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderMember = ({ item, index }: { item: Member; index: number }) => {
    const isMe = item.user?.id === currentUser?.id;
    return (
      <View style={[styles.memberRow, isMe && styles.memberRowMe]}>
        <View style={styles.rankWrap}>
          {index < 3 ? (
            <Text style={styles.medal}>{MEDAL[index]}</Text>
          ) : (
            <Text style={styles.rankNum}>{index + 1}</Text>
          )}
        </View>
        {item.user?.avatarUrl ? (
          <Image source={{ uri: item.user.avatarUrl }} style={styles.memberAvatar} />
        ) : (
          <View style={[styles.memberAvatar, styles.memberAvatarFallback]}>
            <Text style={styles.memberInitial}>{item.user?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.memberName} numberOfLines={1}>
              {item.user?.name || 'Atleta'}{isMe ? ' (você)' : ''}
            </Text>
            {item.role === 'admin' && (
              <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
            )}
          </View>
          {item.contributedActivities != null && (
            <Text style={styles.memberSub}>{item.contributedActivities} atividades</Text>
          )}
        </View>
        <Text style={styles.memberKm}>{(item.contributedKm || 0).toFixed(1)} km</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top + 12, 56) }]}
      >
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group?.name || groupName || 'Grupo'}</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color="#FF6B35" /></View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          renderItem={renderMember}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#FF6B35" />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              {/* Hero */}
              <View style={styles.hero}>
                <LinearGradient colors={['#FF6B35', '#FF4500']} style={styles.heroAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.heroLetter}>{(group?.name || 'G')[0]?.toUpperCase()}</Text>
                </LinearGradient>
                {group?.description ? <Text style={styles.heroDesc}>{group.description}</Text> : null}
                <View style={styles.heroMetaRow}>
                  {group?.sport ? <Text style={styles.heroMeta}>🏃 {group.sport}</Text> : null}
                  {group?.city ? <Text style={styles.heroMeta}>📍 {group.city}</Text> : null}
                  {group?.isPrivate ? <Text style={styles.heroMeta}>🔒 Privado</Text> : null}
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{Math.round(group?.totalDistanceKm || 0)}</Text>
                    <Text style={styles.statLabel}>km do grupo</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{group?.memberCount ?? members.length}</Text>
                    <Text style={styles.statLabel}>membros</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{group?.totalActivities ?? 0}</Text>
                    <Text style={styles.statLabel}>atividades</Text>
                  </View>
                </View>

                {/* Join / Leave */}
                {isMember ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.leaveBtn]} onPress={handleLeave} disabled={busy}>
                    {busy ? <ActivityIndicator size="small" color="#F87171" /> : (
                      <><Ionicons name="exit-outline" size={18} color="#F87171" /><Text style={styles.leaveText}>Sair do grupo</Text></>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.actionBtn} onPress={handleJoin} disabled={busy} activeOpacity={0.85}>
                    <LinearGradient colors={['#FF6B35', '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.joinGradient}>
                      {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                        <><Ionicons name="add" size={18} color="#fff" /><Text style={styles.joinText}>Entrar no grupo</Text></>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.membersHeader}>
                <Ionicons name="trophy" size={16} color="#FCD34D" />
                <Text style={styles.membersTitle}>Ranking de membros</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>Ainda sem membros com km registrados.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  heroAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroLetter: { color: '#fff', fontSize: 32, fontWeight: '900' },
  heroDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginTop: 4 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  heroMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FF6B35', fontSize: 22, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },

  actionBtn: { alignSelf: 'stretch', borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.sm },
  joinGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  joinText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14,
    backgroundColor: 'rgba(248,113,113,0.10)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)',
  },
  leaveText: { color: '#F87171', fontSize: 15, fontWeight: '700' },

  membersHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.xs },
  membersTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.md, marginBottom: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing.sm,
  },
  memberRowMe: { borderColor: 'rgba(255,107,53,0.4)', backgroundColor: 'rgba(255,107,53,0.06)' },
  rankWrap: { width: 28, alignItems: 'center' },
  medal: { fontSize: 18 },
  rankNum: { color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: 13 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20 },
  memberAvatarFallback: { backgroundColor: 'rgba(255,107,53,0.2)', alignItems: 'center', justifyContent: 'center' },
  memberInitial: { color: '#FF6B35', fontWeight: '800', fontSize: 16 },
  memberName: { color: '#fff', fontSize: 14, fontWeight: '700', maxWidth: 150 },
  memberSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  memberKm: { color: '#FCD34D', fontSize: 15, fontWeight: '800' },
  adminBadge: { backgroundColor: 'rgba(255,107,53,0.18)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  adminBadgeText: { color: '#FF6B35', fontSize: 9, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 10 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
});
