// Termos de uso
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
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
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Termos de Uso</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>Última atualização: 23/05/2026</Text>

        <Text style={styles.h2}>1. Aceitação</Text>
        <Text style={styles.p}>
          Ao usar o Sync, você concorda com estes termos. Se não concorda, não use o app.
        </Text>

        <Text style={styles.h2}>2. Idade mínima</Text>
        <Text style={styles.p}>
          Você precisa ter pelo menos 13 anos para usar o Sync. Menores de 18 devem ter consentimento dos responsáveis.
        </Text>

        <Text style={styles.h2}>3. Conduta</Text>
        <Text style={styles.p}>
          Não é permitido:
          {'\n'}• Assédio, discurso de ódio ou conteúdo ilegal
          {'\n'}• Fake profiles, impersonação
          {'\n'}• Spam, comerciais não autorizados
          {'\n'}• Uso para fins ilícitos
          {'\n\n'}Violações resultam em banimento.
        </Text>

        <Text style={styles.h2}>4. Atividade física</Text>
        <Text style={styles.p}>
          Você é responsável pela sua segurança ao se exercitar. Consulte um médico antes de começar. O Sync NÃO substitui orientação profissional.
        </Text>

        <Text style={styles.h2}>5. Conteúdo do usuário</Text>
        <Text style={styles.p}>
          Você mantém o direito sobre tudo que posta, mas concede ao Sync licença para exibir aos outros usuários conforme suas configurações.
        </Text>

        <Text style={styles.h2}>6. Assinaturas Premium</Text>
        <Text style={styles.p}>
          Planos pagos renovam automaticamente. Cancele a qualquer momento em Configurações.
        </Text>

        <Text style={styles.h2}>7. Limitação de responsabilidade</Text>
        <Text style={styles.p}>
          O Sync é fornecido "como está". Não nos responsabilizamos por lesões durante exercício, perda de dados ou indisponibilidade temporária.
        </Text>

        <Text style={styles.h2}>8. Modificações</Text>
        <Text style={styles.p}>
          Estes termos podem mudar. Avisaremos por email/push quando houver alterações relevantes.
        </Text>

        <Text style={styles.h2}>9. Foro</Text>
        <Text style={styles.p}>
          Brasil. Lei brasileira aplicável. LGPD respeitada.
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingTop dinâmico via insets no JSX (notch/safe-area)
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.dark.text, letterSpacing: 0.3 },
  content: { padding: spacing.lg },
  date: { color: colors.dark.secondaryText, fontSize: 12, marginBottom: spacing.lg, fontStyle: 'italic' },
  h2: {
    color: colors.dark.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  p: { color: colors.dark.text, fontSize: 14, lineHeight: 22 },
});
