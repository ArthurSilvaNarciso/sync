// Tela de Desafios — inbox/outbox, aceitar/recusar, criar novo desafio
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
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { challengesService, Challenge } from '../../services/challenges.service';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../components/ui/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: 'Pendente',   color: '#FCD34D', icon: 'time-outline' },
  accepted:  { label: 'Em andamento', color: '#3B82F6', icon: 'flash-outline' },
  completed: { label: 'Concluído',  color: '#10B981', icon: 'checkmark-circle-outline' },
  declined:  { label: 'Recusado',   color: '#F87171', icon: 'close-circle-outline' },
  expired:   { label: 'Expirado',   color: '#6B7280', icon: 'hourglass-outline' },
};

const SPORTS = [
  'Corrida', 'Ciclismo', 'Natação', 'Caminhada', 'Trilha',
  'Futebol', 'Tênis', 'Musculação', 'CrossFit', 'Yoga',
];

const METRICS: { id: 'distance' | 'pace' | 'duration'; label: string; unit: string }[] = [
  { id: 'distance', label: 'Distância', unit: 'km' },
  { id: 'pace',     label: 'Pace',      unit: 'min/km' },
  { id: 'duration', label: 'Duração',   unit: 'min' },
];

const TABS = ['Recebidos', 'Enviados', 'Histórico'] as const;
type Tab = typeof TABS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTarget(metric: string, target: number) {
  switch (metric) {
    case 'distance': return `${target} km`;
    case 'pace':     return `${target} min/km`;
    case 'duration': return `${target} min`;
    default:         return String(target);
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(min / 60);
  const d    = Math.floor(h / 24);
  if (d > 0)   return `${d}d atrás`;
  if (h > 0)   return `${h}h atrás`;
  if (min > 0) return `${min}min atrás`;
  return 'agora';
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChallengesScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Recebidos');
  const [responding, setResponding] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // ── Create form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    challengedId: '',
    sport: SPORTS[0],
    metric: 'distance' as 'distance' | 'pace' | 'duration',
    target: '',
    expiresInDays: '7',
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await challengesService.list();
      setChallenges(data);
    } catch {
      if (!silent) showToast('Erro ao carregar desafios', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtered list per tab ──────────────────────────────────────────────────
  const filteredChallenges = challenges.filter((c) => {
    const isReceived = c.challenged_id === user?.id;
    const isSent = c.challenger_id === user?.id;
    const isActive = c.status === 'pending' || c.status === 'accepted';
    const isDone = c.status === 'completed' || c.status === 'declined' || c.status === 'expired';

    if (activeTab === 'Recebidos') return isReceived && isActive;
    if (activeTab === 'Enviados')  return isSent && isActive;
    if (activeTab === 'Histórico') return isDone && (isReceived || isSent);
    return false;
  });

  // ── Respond to challenge (accept / decline) ────────────────────────────────
  const handleRespond = async (challenge: Challenge, accept: boolean) => {
    setResponding(challenge.id);
    try {
      await challengesService.respond(challenge.id, accept);
      showToast(accept ? 'Desafio aceito! 💪' : 'Desafio recusado', accept ? 'success' : 'info');
      await load(true);
    } catch {
      showToast('Erro ao responder', 'error');
    } finally {
      setResponding(null);
    }
  };

  // ── Complete a challenge ───────────────────────────────────────────────────
  const handleComplete = (challenge: Challenge) => {
    Alert.alert(
      'Marcar como concluído?',
      `Confirmar conclusão do desafio de ${challenge.sport}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluído ✓',
          onPress: async () => {
            setCompleting(challenge.id);
            try {
              await challengesService.complete(challenge.id);
              showToast('Desafio concluído! 🏆', 'success');
              await load(true);
            } catch {
              showToast('Erro ao concluir', 'error');
            } finally {
              setCompleting(null);
            }
          },
        },
      ],
    );
  };

  // ── Create challenge ───────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.challengedId.trim()) {
      showToast('Informe o ID do usuário', 'error'); return;
    }
    const target = parseFloat(form.target);
    if (!target || target <= 0) {
      showToast('Meta inválida', 'error'); return;
    }

    setCreating(true);
    try {
      await challengesService.create({
        challengedId: form.challengedId.trim(),
        sport: form.sport,
        metric: form.metric,
        target,
        expiresInDays: parseInt(form.expiresInDays) || 7,
      });
      showToast('Desafio enviado! ⚡', 'success');
      setShowCreate(false);
      setForm({ challengedId: '', sport: SPORTS[0], metric: 'distance', target: '', expiresInDays: '7' });
      await load(true);
    } catch {
      showToast('Erro ao criar desafio', 'error');
    } finally {
      setCreating(false);
    }
  };

  // ── Render challenge card ──────────────────────────────────────────────────
  const renderChallenge = ({ item }: { item: Challenge }) => {
    const meta = STATUS_META[item.status] || STATUS_META.pending;
    const isMine = item.challenger_id === user?.id;
    const opponent = isMine ? item.challenged : item.challenger;
    const isResponding = responding === item.id;
    const isCompleting = completing === item.id;

    return (
      <View style={styles.card}>
        {/* Top row: opponent info + status badge */}
        <View style={styles.cardTop}>
          <View style={styles.opponentRow}>
            {opponent?.avatarUrl ? (
              <Image source={{ uri: opponent.avatarUrl }} style={styles.oppAvatar} />
            ) : (
              <View style={[styles.oppAvatar, styles.oppAvatarFallback]}>
                <Text style={styles.oppAvatarInitial}>
                  {opponent?.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.opponentName} numberOfLines={1}>
                {opponent?.name || 'Usuário desconhecido'}
              </Text>
              <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: meta.color + '20', borderColor: meta.color + '40' }]}>
            <Ionicons name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Challenge details */}
        <View style={styles.challengeDetails}>
          <View style={styles.detailChip}>
            <Ionicons name="fitness-outline" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={styles.detailText}>{item.sport}</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="trending-up-outline" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={styles.detailText}>{formatTarget(item.metric, item.target)}</Text>
          </View>
          {item.expiresAt && (
            <View style={styles.detailChip}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.5)" />
              <Text style={styles.detailText}>
                {new Date(item.expiresAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
        </View>

        {/* Direction label */}
        <Text style={styles.directionLabel}>
          {isMine ? '📤 Você desafiou' : '📥 Te desafiou'}
        </Text>

        {/* Action buttons */}
        {item.status === 'pending' && !isMine && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.declineBtn]}
              onPress={() => handleRespond(item, false)}
              disabled={isResponding}
              activeOpacity={0.7}
            >
              {isResponding ? (
                <ActivityIndicator size="small" color="#F87171" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#F87171" />
                  <Text style={[styles.actionBtnText, { color: '#F87171' }]}>Recusar</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleRespond(item, true)}
              disabled={isResponding}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#FF6B35', '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptGradient}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>Aceitar</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.completeBtn, isCompleting && { opacity: 0.6 }]}
            onPress={() => handleComplete(item)}
            disabled={isCompleting}
            activeOpacity={0.7}
          >
            {isCompleting ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <>
                <Ionicons name="flag-outline" size={15} color="#10B981" />
                <Text style={styles.completeBtnText}>Marcar como concluído</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {item.status === 'completed' && item.winner_id && (
          <View style={styles.winnerBadge}>
            <Ionicons name="trophy" size={14} color="#FCD34D" />
            <Text style={styles.winnerText}>
              {item.winner_id === user?.id ? 'Você venceu! 🏆' : `${opponent?.name || 'Oponente'} venceu`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Desafios</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={22} color="#FF6B35" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={filteredChallenges}
          keyExtractor={(item) => item.id}
          renderItem={renderChallenge}
          contentContainerStyle={[
            styles.listContent,
            filteredChallenges.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor="#FF6B35"
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="flash-outline" size={36} color="rgba(255,255,255,0.15)" />
              </View>
              <Text style={styles.emptyTitle}>Nenhum desafio aqui</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'Recebidos'
                  ? 'Quando alguém te desafiar, aparecerá aqui.'
                  : activeTab === 'Enviados'
                  ? 'Toque no + para desafiar um amigo!'
                  : 'Desafios finalizados aparecerão aqui.'}
              </Text>
              {activeTab === 'Enviados' && (
                <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowCreate(true)}>
                  <LinearGradient
                    colors={['#FF6B35', '#FF4500']}
                    style={styles.emptyCreateGradient}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.emptyCreateText}>Criar desafio</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Create Challenge Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandleBar} />
              <Text style={styles.modalTitle}>Novo desafio ⚡</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowCreate(false)}
              >
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* User ID */}
              <Text style={styles.formLabel}>ID do usuário desafiado</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Cole o ID do usuário aqui"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={form.challengedId}
                onChangeText={(v) => setForm((f) => ({ ...f, challengedId: v }))}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Sport */}
              <Text style={styles.formLabel}>Esporte</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <View style={styles.chipsRow}>
                  {SPORTS.map((sport) => (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.chip, form.sport === sport && styles.chipActive]}
                      onPress={() => setForm((f) => ({ ...f, sport }))}
                    >
                      <Text style={[styles.chipText, form.sport === sport && styles.chipTextActive]}>
                        {sport}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Metric */}
              <Text style={styles.formLabel}>Tipo de meta</Text>
              <View style={styles.metricRow}>
                {METRICS.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.metricBtn, form.metric === m.id && styles.metricBtnActive]}
                    onPress={() => setForm((f) => ({ ...f, metric: m.id }))}
                  >
                    <Text style={[styles.metricBtnText, form.metric === m.id && styles.metricBtnTextActive]}>
                      {m.label}
                    </Text>
                    <Text style={styles.metricUnit}>{m.unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target */}
              <Text style={styles.formLabel}>
                Meta ({METRICS.find((m) => m.id === form.metric)?.unit || ''})
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ex: 5"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={form.target}
                onChangeText={(v) => setForm((f) => ({ ...f, target: v }))}
                keyboardType="numeric"
              />

              {/* Expiry */}
              <Text style={styles.formLabel}>Prazo (dias)</Text>
              <View style={styles.expiryRow}>
                {['3', '7', '14', '30'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, form.expiresInDays === d && styles.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, expiresInDays: d }))}
                  >
                    <Text style={[styles.chipText, form.expiresInDays === d && styles.chipTextActive]}>
                      {d}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={creating}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF6B35', '#FF4500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={18} color="#fff" />
                      <Text style={styles.submitText}>Enviar desafio</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
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
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.30)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#FF6B35' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // Loading / empty
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: spacing.md, paddingBottom: 80 },
  listContentEmpty: { flex: 1 },
  emptyWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: '#fff', textAlign: 'center' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },
  emptyCreateBtn: { borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.sm },
  emptyCreateGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: spacing.xl,
  },
  emptyCreateText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Challenge card
  card: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  opponentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  oppAvatar: { width: 38, height: 38, borderRadius: 19 },
  oppAvatarFallback: {
    backgroundColor: 'rgba(255,107,53,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  oppAvatarInitial: { fontSize: 15, fontWeight: '700', color: '#FF6B35' },
  opponentName: { fontSize: 14, fontWeight: '700', color: '#fff', maxWidth: 160 },
  cardTime: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  challengeDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  detailChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  detailText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  directionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, borderRadius: borderRadius.sm, overflow: 'hidden', minHeight: 42 },
  declineBtn: {
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  acceptBtn: { overflow: 'hidden', borderRadius: borderRadius.sm },
  acceptGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
    borderRadius: borderRadius.sm, paddingVertical: 10,
  },
  completeBtnText: { fontSize: 13, fontWeight: '600', color: '#10B981' },

  winnerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(252,211,77,0.10)',
    borderRadius: borderRadius.sm, padding: 8,
  },
  winnerText: { fontSize: 13, fontWeight: '700', color: '#FCD34D' },

  // ── Create Modal ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#13131F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalHandleBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  modalCloseBtn: {
    position: 'absolute', right: 0, top: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Form
  formLabel: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    color: '#fff', fontSize: 14,
    marginBottom: spacing.lg,
  },
  chipsScroll: { marginBottom: spacing.lg },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipActive: { backgroundColor: 'rgba(255,107,53,0.18)', borderColor: 'rgba(255,107,53,0.45)' },
  chipText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  chipTextActive: { color: '#FF6B35' },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  metricBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.sm, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  metricBtnActive: { backgroundColor: 'rgba(255,107,53,0.18)', borderColor: 'rgba(255,107,53,0.45)' },
  metricBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  metricBtnTextActive: { color: '#FF6B35' },
  metricUnit: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  expiryRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.xl },

  submitBtn: { borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.sm },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
