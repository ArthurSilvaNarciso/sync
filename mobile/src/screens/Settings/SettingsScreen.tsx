// Tela de configurações — surface sessões, LGPD, conta, notificações, plano
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { showToast } from '../../components/ui/Toast';

interface Session {
  familyId: string;
  userAgent: string | null;
  ipMasked: string | null;
  createdAt: string;
}

export default function SettingsScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [pushOn, setPushOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);

  useEffect(() => {
    api.get('/auth/sessions').then((r) => setSessions(r.data || [])).catch(() => {});
    api.get('/subscriptions/me').then((r) => setPlan(r.data)).catch(() => {});
  }, []);

  const handleRevokeSession = async (familyId: string) => {
    try {
      await api.delete(`/auth/sessions/${familyId}`);
      setSessions((s) => s.filter((x) => x.familyId !== familyId));
      showToast('Sessão revogada', 'success');
    } catch {
      showToast('Erro ao revogar sessão', 'error');
    }
  };

  const handleExportData = async () => {
    try {
      const { data } = await api.get('/users/me/export');
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sync-meus-dados-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Dados exportados!', 'success');
      } else {
        showToast('Em mobile: copie do log', 'info');
        console.log(json);
      }
    } catch {
      showToast('Erro ao exportar', 'error');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Apagar conta?',
      'Sua conta será anonimizada. Atividades públicas preservadas com nome anônimo. Irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/users/me');
              showToast('Conta anonimizada', 'success');
              await logout();
            } catch {
              showToast('Erro ao apagar', 'error');
            }
          },
        },
      ],
    );
  };

  const handleUpgrade = async () => {
    try {
      const { data } = await api.post('/subscriptions/upgrade', { tier: 'premium' });
      showToast(data.message || 'Upgrade!', 'success');
      const { data: meData } = await api.get('/subscriptions/me');
      setPlan(meData);
    } catch {
      showToast('Erro no upgrade', 'error');
    }
  };

  const Row = ({ icon, label, value, onPress, danger, color = '#FF6B35', right }: any) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
      <View style={[styles.rowIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: '#F87171' }]}>{label}</Text>
      {right || (
        <>
          {value !== undefined && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
          {onPress && <Ionicons name="chevron-forward" size={16} color={colors.dark.secondaryText} />}
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sectionTitle}>CONTA</Text>
      <View style={styles.section}>
        <Row icon="person-outline" label="Nome" value={user?.name} />
        <Row icon="mail-outline" label="Email" value={user?.email} />
        <Row icon="create-outline" label="Editar perfil" onPress={() => navigation?.navigate?.('EditProfile')} />
        <Row icon="lock-closed-outline" label="Alterar senha" onPress={() => showToast('Em breve', 'info')} />
      </View>

      <Text style={styles.sectionTitle}>PLANO</Text>
      <View style={styles.section}>
        <Row
          icon="star"
          label={plan?.plan?.name || 'Free'}
          value={plan?.plan?.price === 0 ? 'Grátis' : `R$ ${plan?.plan?.price}/mês`}
          color="#FCD34D"
        />
        {plan?.currentTier === 'free' && (
          <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
            <Text style={styles.upgradeBtnText}>⭐ Upgrade pra Premium (R$ 19/mês)</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>NOTIFICAÇÕES</Text>
      <View style={styles.section}>
        <Row
          icon="notifications"
          label="Push notifications"
          right={
            <Switch
              value={pushOn}
              onValueChange={setPushOn}
              trackColor={{ false: '#3A3A3F', true: '#FF6B35' }}
              thumbColor="#fff"
            />
          }
        />
        <Row
          icon="mail"
          label="Notificações por email"
          color="#3B82F6"
          right={
            <Switch
              value={emailOn}
              onValueChange={setEmailOn}
              trackColor={{ false: '#3A3A3F', true: '#3B82F6' }}
              thumbColor="#fff"
            />
          }
        />
      </View>

      <Text style={styles.sectionTitle}>SESSÕES ATIVAS</Text>
      <View style={styles.section}>
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>Apenas esta sessão ativa.</Text>
        ) : (
          sessions.map((s) => (
            <View key={s.familyId} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(168,139,250,0.22)' }]}>
                <Ionicons name="phone-portrait" size={18} color="#A78BFA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {(s.userAgent || 'Device').split('/')[0]} • {s.ipMasked || '—'}
                </Text>
                <Text style={styles.rowSub}>
                  Desde {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRevokeSession(s.familyId)}>
                <Text style={styles.revokeText}>Revogar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>PRIVACIDADE & LGPD</Text>
      <View style={styles.section}>
        <Row icon="download-outline" label="Exportar meus dados" onPress={handleExportData} color="#10B981" />
        <Row icon="document-text-outline" label="Política de privacidade" onPress={() => showToast('Em breve', 'info')} color="#10B981" />
        <Row icon="document-outline" label="Termos de uso" onPress={() => showToast('Em breve', 'info')} color="#10B981" />
      </View>

      <Text style={styles.sectionTitle}>SUPORTE</Text>
      <View style={styles.section}>
        <Row icon="help-circle-outline" label="Central de ajuda" onPress={() => showToast('Em breve', 'info')} />
        <Row icon="bug-outline" label="Reportar problema" onPress={() => Linking.openURL('mailto:support@sync.app').catch(() => {})} />
        <Row icon="star-outline" label="Avaliar o app" onPress={() => showToast('Obrigado!', 'success')} />
      </View>

      <Text style={styles.sectionTitle}>CONTA</Text>
      <View style={styles.section}>
        <Row icon="log-out-outline" label="Sair" onPress={logout} color="#F87171" danger />
        <Row icon="trash-outline" label="Apagar minha conta" onPress={handleDeleteAccount} color="#F87171" danger />
      </View>

      <Text style={styles.version}>Sync v1.0.0</Text>
    </ScrollView>
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
    paddingBottom: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.dark.text },
  sectionTitle: {
    color: colors.dark.secondaryText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: spacing.sm,
    minHeight: 56,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { color: colors.dark.text, fontSize: 14, fontWeight: '600', flex: 1 },
  rowValue: { color: colors.dark.secondaryText, fontSize: 13, maxWidth: 180 },
  rowSub: { color: colors.dark.secondaryText, fontSize: 11, marginTop: 2 },
  revokeText: { color: '#F87171', fontSize: 12, fontWeight: '700' },
  emptyText: {
    color: colors.dark.secondaryText,
    padding: spacing.md,
    fontSize: 12,
    fontStyle: 'italic',
  },
  upgradeBtn: {
    backgroundColor: '#FF6B35',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  upgradeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  version: {
    textAlign: 'center',
    color: colors.dark.secondaryText,
    fontSize: 11,
    marginTop: spacing.xl,
  },
});
