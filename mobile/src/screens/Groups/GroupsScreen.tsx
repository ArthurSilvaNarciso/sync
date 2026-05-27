// Tela principal de grupos: meus grupos + descobrir + ranking
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  Modal,
  TextInput,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { groupsApi, GroupSummary } from '../../services/groups.service';
import Button from '../../components/ui/Button';

type Tab = 'mine' | 'discover' | 'ranking';

export default function GroupsScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('mine');
  const [mine, setMine] = useState<GroupSummary[]>([]);
  const [discover, setDiscover] = useState<GroupSummary[]>([]);
  const [ranking, setRanking] = useState<(GroupSummary & { position: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', sport: 'Corrida', city: '', isPrivate: false });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        groupsApi.myGroups().catch(() => []),
        groupsApi.listPublic().catch(() => []),
        groupsApi.ranking().catch(() => []),
      ]);
      setMine(a);
      setDiscover(b);
      setRanking(c);
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

  const handleCreate = async () => {
    if (form.name.trim().length < 3) {
      Alert.alert('Nome muito curto', 'O nome do grupo precisa ter pelo menos 3 caracteres');
      return;
    }
    setCreating(true);
    try {
      const created = await groupsApi.create(form);
      setShowCreate(false);
      setForm({ name: '', description: '', sport: 'Corrida', city: '', isPrivate: false });
      Alert.alert(
        'Grupo criado! 🎉',
        created.isPrivate
          ? `Código de convite: ${created.inviteCode}\nCompartilhe com quem você quer no grupo.`
          : 'Seu grupo é público e já aparece no Descobrir.',
      );
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível criar o grupo');
    } finally {
      setCreating(false);
    }
  };

  const renderGroup = (g: GroupSummary & { position?: number }) => (
    <TouchableOpacity
      key={g.id}
      style={styles.card}
      onPress={() => navigation?.navigate?.('GroupDetail', { groupId: g.id }) || Alert.alert(g.name, g.description || 'Sem descrição')}
      activeOpacity={0.7}
    >
      {g.position != null && (
        <View style={styles.positionBadge}>
          <Text style={styles.positionText}>{g.position}</Text>
        </View>
      )}
      <LinearGradient
        colors={['#FF6B35', '#FF4500']}
        style={styles.avatarFallback}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.avatarLetter}>{g.name[0]?.toUpperCase() || 'G'}</Text>
      </LinearGradient>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.cardName} numberOfLines={1}>{g.name}</Text>
          {g.isPrivate && <Ionicons name="lock-closed" size={12} color={colors.dark.secondaryText} />}
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {g.sport ? `${g.sport} • ` : ''}{g.memberCount} membros • {Math.round(g.totalDistanceKm)} km
        </Text>
        {g.city && <Text style={styles.cardCity}>📍 {g.city}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.dark.secondaryText} />
    </TouchableOpacity>
  );

  const data = tab === 'mine' ? mine : tab === 'discover' ? discover : ranking;
  const emptyMsg =
    tab === 'mine' ? 'Você ainda não está em nenhum grupo. Crie um ou entre num grupo público!'
    : tab === 'discover' ? 'Nenhum grupo público encontrado.'
    : 'Ranking ainda em construção.';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Grupos</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {([
          { id: 'mine', label: 'Meus', icon: 'people' },
          { id: 'discover', label: 'Descobrir', icon: 'compass' },
          { id: 'ranking', label: 'Ranking', icon: 'trophy' },
        ] as const).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Ionicons name={t.icon as any} size={14} color={tab === t.id ? '#fff' : colors.dark.secondaryText} />
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data as any}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: any) => renderGroup(item)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-circle-outline" size={64} color={colors.dark.secondaryText} />
            <Text style={styles.emptyText}>{emptyMsg}</Text>
          </View>
        }
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
      />

      {/* Modal de criação */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo grupo</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={colors.dark.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Nome do grupo *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="Ex: Runners de Pinheiros"
                placeholderTextColor={colors.dark.secondaryText}
                maxLength={80}
              />
              <Text style={styles.formLabel}>Descrição</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                placeholder="Sobre o que é o grupo?"
                placeholderTextColor={colors.dark.secondaryText}
                multiline
                maxLength={300}
              />
              <Text style={styles.formLabel}>Esporte principal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {['Corrida', 'Ciclismo', 'Natação', 'Trilha', 'Academia', 'Caminhada'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, form.sport === s && styles.chipActive]}
                    onPress={() => setForm({ ...form, sport: s })}
                  >
                    <Text style={[styles.chipText, form.sport === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.formLabel}>Cidade</Text>
              <TextInput
                style={styles.input}
                value={form.city}
                onChangeText={(v) => setForm({ ...form, city: v })}
                placeholder="Ex: São Paulo"
                placeholderTextColor={colors.dark.secondaryText}
              />

              <View style={styles.privacyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Grupo privado</Text>
                  <Text style={styles.privacyHint}>
                    Privado: só entra com código. Público: aparece no Descobrir.
                  </Text>
                </View>
                <Switch
                  value={form.isPrivate}
                  onValueChange={(v) => setForm({ ...form, isPrivate: v })}
                  trackColor={{ false: '#3A3A3F', true: '#FF6B35' }}
                  thumbColor="#fff"
                />
              </View>

              <Button
                title={creating ? 'Criando...' : 'Criar grupo'}
                onPress={handleCreate}
                loading={creating}
                style={{ marginTop: spacing.lg }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: { padding: 4, marginRight: spacing.sm },
  title: { flex: 1, fontSize: fontSize.xxl, fontWeight: '800', color: colors.dark.text },
  createBtn: {
    backgroundColor: '#FF6B35',
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B35', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
    elevation: 6,
  },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.dark.secondaryText },
  tabTextActive: { color: '#fff', fontWeight: '800' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  positionBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(255,107,53,0.18)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  positionText: { color: '#FF6B35', fontWeight: '800', fontSize: 11 },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '800', fontSize: 22 },
  cardName: { color: colors.dark.text, fontSize: fontSize.md, fontWeight: '700' },
  cardMeta: { color: colors.dark.secondaryText, fontSize: 12, marginTop: 2 },
  cardCity: { color: colors.dark.accent, fontSize: 11, marginTop: 2 },
  emptyWrap: { alignItems: 'center', marginTop: 80, paddingHorizontal: spacing.xl },
  emptyText: { color: colors.dark.secondaryText, textAlign: 'center', marginTop: spacing.md },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0F0F18',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.dark.text },
  formLabel: { color: colors.dark.text, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    color: colors.dark.text, fontSize: fontSize.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  chipText: { color: colors.dark.secondaryText, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '800' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  privacyHint: { color: colors.dark.secondaryText, fontSize: 11, marginTop: 2 },
});
