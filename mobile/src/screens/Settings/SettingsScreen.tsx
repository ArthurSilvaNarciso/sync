import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;
};

export default function SettingsScreen({ navigation }: Props) {
  const { logout } = useAuthStore();
  const [notifications, setNotifications] = useState({
    matches: true,
    messages: true,
    events: true,
    weeklyReport: true,
  });
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    shareLocation: true,
    showDistance: true,
    showOnlineStatus: true,
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const saveNotificationSettings = async (key: string, value: boolean) => {
    const newSettings = { ...notifications, [key]: value };
    setNotifications(newSettings);
    setSavingNotif(true);
    try {
      await api.put('/users/settings/notifications', newSettings);
    } catch (error) {
      console.log('Error saving notification settings:', error);
    } finally {
      setSavingNotif(false);
    }
  };

  const savePrivacySettings = async (key: string, value: boolean) => {
    const newSettings = { ...privacy, [key]: value };
    setPrivacy(newSettings);
    setSavingPrivacy(true);
    try {
      await api.put('/users/settings/privacy', newSettings);
    } catch (error) {
      console.log('Error saving privacy settings:', error);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleChangePassword = () => {
    Alert.prompt?.(
      'Alterar senha',
      'Digite sua nova senha',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Alterar',
          onPress: async (newPassword) => {
            if (!newPassword || newPassword.length < 6) {
              Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
              return;
            }
            try {
              await api.put('/auth/change-password', { newPassword });
              Alert.alert('Sucesso', 'Senha alterada com sucesso');
            } catch {
              Alert.alert('Erro', 'Nao foi possivel alterar a senha');
            }
          },
        },
      ],
      'secure-text',
    ) || Alert.alert('Alterar senha', 'Funcionalidade disponivel em breve');
  };

  const handleTerms = () => {
    Alert.alert(
      'Termos e LGPD',
      'O Sync respeita sua privacidade e segue a Lei Geral de Protecao de Dados (LGPD).\n\nSeus dados sao armazenados de forma segura e voce pode solicitar exclusao a qualquer momento.\n\nPara mais informacoes, entre em contato com nosso suporte.',
      [
        { text: 'OK' },
        { text: 'Contatar suporte', onPress: () => Linking.openURL('mailto:suporte@sync-app.com') },
      ],
    );
  };

  const handleReport = () => {
    Alert.alert(
      'Denunciar problema',
      'Selecione o tipo de problema:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Bug no app', onPress: () => Alert.alert('Obrigado!', 'Recebemos sua denuncia de bug. Nossa equipe ira analisar.') },
        { text: 'Conteudo impróprio', onPress: () => Alert.alert('Obrigado!', 'Iremos investigar o conteudo reportado.') },
        { text: 'Assedio', onPress: () => Alert.alert('Recebido', 'Levamos isso muito a serio. Iremos investigar imediatamente.') },
        { text: 'Outro', onPress: () => Linking.openURL('mailto:suporte@sync-app.com?subject=Denuncia') },
      ],
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpar cache',
      'Isso ira limpar dados temporarios do app. Voce nao perdera seus dados de conta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', onPress: () => Alert.alert('Cache limpo', 'Dados temporarios foram removidos.') },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir conta',
      'Esta acao e irreversivel. Todos os seus dados serao apagados permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir permanentemente',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar exclusao',
              'Tem certeza absoluta? Esta acao NAO pode ser desfeita.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim, excluir',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.delete('/users/me');
                      logout();
                    } catch {
                      Alert.alert('Erro', 'Nao foi possivel excluir a conta. Tente novamente.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Configuracoes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidade</Text>
          <View style={styles.card}>
            <View style={styles.switchItem}>
              <View style={styles.itemLeft}>
                <Ionicons name="eye-outline" size={20} color={colors.primary} />
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemLabel}>Perfil visivel</Text>
                  <Text style={styles.itemDesc}>Aparecer nas buscas de outros usuarios</Text>
                </View>
              </View>
              <Switch
                value={privacy.profileVisible}
                onValueChange={(v) => savePrivacySettings('profileVisible', v)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={privacy.profileVisible ? colors.primary : colors.secondaryText}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchItem}>
              <View style={styles.itemLeft}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemLabel}>Compartilhar localizacao</Text>
                  <Text style={styles.itemDesc}>Permitir que outros vejam sua area</Text>
                </View>
              </View>
              <Switch
                value={privacy.shareLocation}
                onValueChange={(v) => savePrivacySettings('shareLocation', v)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={privacy.shareLocation ? colors.primary : colors.secondaryText}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchItem}>
              <View style={styles.itemLeft}>
                <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemLabel}>Mostrar distancia</Text>
                  <Text style={styles.itemDesc}>Exibir distancia no seu perfil</Text>
                </View>
              </View>
              <Switch
                value={privacy.showDistance}
                onValueChange={(v) => savePrivacySettings('showDistance', v)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={privacy.showDistance ? colors.primary : colors.secondaryText}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchItem}>
              <View style={styles.itemLeft}>
                <Ionicons name="ellipse" size={12} color={colors.success} style={{ marginLeft: 4, marginRight: 4 }} />
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemLabel}>Status online</Text>
                  <Text style={styles.itemDesc}>Mostrar quando voce esta ativo</Text>
                </View>
              </View>
              <Switch
                value={privacy.showOnlineStatus}
                onValueChange={(v) => savePrivacySettings('showOnlineStatus', v)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={privacy.showOnlineStatus ? colors.primary : colors.secondaryText}
              />
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificacoes</Text>
          <View style={styles.card}>
            <View style={styles.switchItem}>
              <View style={styles.itemLeft}>
                <Ionicons name="heart-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Matches</Text>
              </View>
              <Switch
                value={notifications.matches}
                onValueChange={(v) => saveNotificationSettings('matches', v)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={notifications.matches ? colors.primary : colors.secondaryText}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchItem}>
              <View style={styles.itemLeft}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Mensagens</Text>
              </View>
              <Switch
                value={notifications.messages}
                onValueChange={(v) => saveNotificationSettings('messages', v)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={notifications.messages ? colors.primary : colors.secondaryText}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchItem}>
              <View style={styles.itemLeft}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Eventos</Text>
              </View>
              <Switch
                value={notifications.events}
                onValueChange={(v) => saveNotificationSettings('events', v)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={notifications.events ? colors.primary : colors.secondaryText}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchItem}>
              <View style={styles.itemLeft}>
                <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Relatorio semanal</Text>
              </View>
              <Switch
                value={notifications.weeklyReport}
                onValueChange={(v) => saveNotificationSettings('weeklyReport', v)}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={notifications.weeklyReport ? colors.primary : colors.secondaryText}
              />
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguranca</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.linkItem} onPress={handleChangePassword}>
              <View style={styles.itemLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Alterar senha</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.linkItem} onPress={handleTerms}>
              <View style={styles.itemLeft}>
                <Ionicons name="shield-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Termos e LGPD</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.linkItem} onPress={handleReport}>
              <View style={styles.itemLeft}>
                <Ionicons name="flag-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Denunciar problema</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.linkItem} onPress={handleClearCache}>
              <View style={styles.itemLeft}>
                <Ionicons name="trash-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Limpar cache</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => Linking.openURL('mailto:suporte@sync-app.com')}
            >
              <View style={styles.itemLeft}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Contatar suporte</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => Alert.alert('Avaliar', 'Obrigado! Redirecionando para a loja...')}
            >
              <View style={styles.itemLeft}>
                <Ionicons name="star-outline" size={20} color={colors.primary} />
                <Text style={styles.itemLabel}>Avaliar o app</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>Excluir conta permanentemente</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Sync v1.0.0 (Build 1)</Text>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
    marginBottom: spacing.md,
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
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  itemDesc: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 20 + spacing.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: fontSize.md,
    color: colors.error,
    fontWeight: '600',
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  deleteText: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    textDecorationLine: 'underline',
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: spacing.lg,
  },
});
