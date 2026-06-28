import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ProfileStackParamList } from '../../navigation/types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import {
  segmentsApi,
  Segment,
  LeaderboardRow,
  formatElapsed,
} from '../../services/segments.service';
import Avatar from '../../components/ui/Avatar';
import ErrorState from '../../components/ui/ErrorState';
import { showToast } from '../../components/ui/Toast';
import { useHaptic } from '../../hooks/useHaptic';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'SegmentDetail'>;
  route: RouteProp<ProfileStackParamList, 'SegmentDetail'>;
};

const medal = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function SegmentDetailScreen({ navigation, route }: Props) {
  const { segmentId } = route.params;
  const insets = useSafeAreaInsets();
  const haptic = useHaptic();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showRecord, setShowRecord] = useState(false);
  const [min, setMin] = useState('');
  const [sec, setSec] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [s, b] = await Promise.all([
        segmentsApi.detail(segmentId),
        segmentsApi.leaderboard(segmentId),
      ]);
      if (!s) { setError(true); return; }
      setSegment(s);
      setBoard(b);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [segmentId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const submitEffort = async () => {
    const m = parseInt(min || '0', 10);
    const s = parseInt(sec || '0', 10);
    const total = m * 60 + s;
    if (!total || total < 1) {
      showToast('Informe um tempo válido (min:seg).', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await segmentsApi.recordEffort(segmentId, total);
      setShowRecord(false);
      setMin(''); setSec('');
      if (res.isKOM) {
        haptic.success();
        showToast('🏆 Novo KOM! Você é o mais rápido aqui!', 'success');
      } else if (res.isPR) {
        haptic.success();
        showToast('🔥 Recorde pessoal neste segmento!', 'success');
      } else {
        showToast('Tempo registrado!', 'success');
      }
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Não foi possível registrar agora.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderRow = ({ item }: { item: LeaderboardRow }) => (
    <View style={styles.row}>
      <View style={styles.rankWrap}>
        {item.rank <= 3 ? (
          <Ionicons name="trophy" size={18} color={medal[item.rank - 1]} />
        ) : (
          <Text style={styles.rankNum}>{item.rank}</Text>
        )}
      </View>
      <Avatar uri={item.avatarUrl} size={40} style={styles.rowAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
        {!!item.city && <Text style={styles.rowCity} numberOfLines={1}>{item.city}</Text>}
      </View>
      {item.isKOM && (
        <View style={styles.komTag}>
          <Text style={styles.komTagText}>KOM</Text>
        </View>
      )}
      <Text style={styles.rowTime}>{formatElapsed(item.elapsedSec)}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !segment) {
    return (
      <View style={styles.center}>
        <ErrorState onRetry={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        style={[styles.header, { paddingTop: Math.max(insets.top + 12, 56) }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>{segment.name}</Text>
      </LinearGradient>

      <FlatList
        data={board}
        keyExtractor={(r) => r.userId}
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {/* Stats do segmento */}
            <View style={styles.statsCard}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{(segment.distanceMeters / 1000).toFixed(2)}</Text>
                <Text style={styles.statLabel}>km</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{segment.attemptsCount}</Text>
                <Text style={styles.statLabel}>tentativas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#FFD700' }]}>
                  {segment.bestTimeSec != null ? formatElapsed(segment.bestTimeSec) : '—'}
                </Text>
                <Text style={styles.statLabel}>KOM</Text>
              </View>
            </View>

            {!!segment.description && (
              <Text style={styles.desc}>{segment.description}</Text>
            )}

            <TouchableOpacity style={styles.recordBtn} onPress={() => setShowRecord(true)} activeOpacity={0.85}>
              <LinearGradient
                colors={[...colors.gradient]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.recordBtnInner}
              >
                <Ionicons name="stopwatch" size={18} color="#fff" />
                <Text style={styles.recordBtnText}>Registrar meu tempo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.boardTitle}>Classificação</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="podium-outline" size={48} color={colors.secondaryText} />
            <Text style={styles.emptyText}>Ninguém marcou tempo ainda. Seja o primeiro KOM! 🏆</Text>
          </View>
        }
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
      />

      {/* Modal: registrar tempo */}
      <Modal visible={showRecord} transparent animationType="fade" onRequestClose={() => setShowRecord(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Seu tempo neste segmento</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={min}
                onChangeText={(t) => setMin(t.replace(/[^0-9]/g, '').slice(0, 3))}
                keyboardType="number-pad"
                placeholder="00"
                placeholderTextColor={colors.secondaryText}
                maxLength={3}
              />
              <Text style={styles.timeColon}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={sec}
                onChangeText={(t) => setSec(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="00"
                placeholderTextColor={colors.secondaryText}
                maxLength={2}
              />
            </View>
            <Text style={styles.timeHint}>minutos : segundos</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowRecord(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={submitEffort} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Registrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  center: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerName: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#15151F', borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.secondaryText, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  desc: { fontSize: fontSize.sm, color: colors.secondaryText, lineHeight: 20, marginBottom: spacing.md },
  recordBtn: { borderRadius: borderRadius.md, overflow: 'hidden', marginBottom: spacing.lg },
  recordBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
  },
  recordBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  boardTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rankWrap: { width: 26, alignItems: 'center' },
  rankNum: { fontSize: fontSize.sm, fontWeight: '700', color: colors.secondaryText },
  rowAvatar: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  rowName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  rowCity: { fontSize: 11, color: colors.secondaryText, marginTop: 1 },
  komTag: { backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  komTagText: { fontSize: 10, fontWeight: '800', color: '#FFD700' },
  rowTime: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, minWidth: 56, textAlign: 'right' },
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.secondaryText, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: '#15151F', borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  timeInput: {
    width: 72, textAlign: 'center', fontSize: 28, fontWeight: '800', color: colors.text,
    backgroundColor: '#0A0A0F', borderRadius: borderRadius.md, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  timeColon: { fontSize: 28, fontWeight: '800', color: colors.secondaryText },
  timeHint: { fontSize: fontSize.xs, color: colors.secondaryText, textAlign: 'center', marginTop: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: borderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  modalCancelText: { color: colors.secondaryText, fontWeight: '700' },
  modalSave: { flex: 1, paddingVertical: 12, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '800' },
});
