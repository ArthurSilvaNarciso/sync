// Central de ajuda — FAQ + contato
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FAQ = [
  {
    q: 'Como começar uma atividade?',
    a: 'Toque no botão central laranja da tab bar (logo Sync), escolha o esporte e toque em "Iniciar". O GPS começa automaticamente.',
  },
  {
    q: 'Por que o GPS não funciona?',
    a: 'Verifique se você liberou permissão de localização. Em browsers desktop, clique no cadeado da URL → permissões → localização. Em iPhone: Ajustes → Sync → Localização → Sempre.',
  },
  {
    q: 'Como faço match com outras pessoas?',
    a: 'Aba "Descobrir" (Feed) mostra atletas próximos. Deslize pra direita = like, esquerda = passar. Match quando ambos curtem.',
  },
  {
    q: 'Como o cálculo de calorias funciona?',
    a: 'Usamos a fórmula MET: Calorias = MET × peso(kg) × horas. MET varia por esporte: caminhada 3.5, corrida 9.8, ciclismo 7.5. Peso default é 70kg.',
  },
  {
    q: 'Posso usar offline?',
    a: 'Parcialmente. A última lista visitada fica em cache (PWA). Mas pra sincronizar atividades e ver feed, precisa de internet.',
  },
  {
    q: 'O que é o Live Tracking?',
    a: 'Você pode gerar um link público temporário (24h) que mostra sua corrida AO VIVO pra família/amigos. Vá em treino ativo → ícone "share-social".',
  },
  {
    q: 'Como criar um grupo?',
    a: 'Perfil → Meus Grupos → ícone "+". Escolha público (qualquer um pode entrar) ou privado (gera código de convite).',
  },
  {
    q: 'Os planos de treino funcionam?',
    a: 'Sim! 5K em 8 semanas, 10K em 10 semanas, 21K em 12 semanas. Acesse Perfil → Planos de treino.',
  },
  {
    q: 'Como exporto minha rota pra Strava/Garmin?',
    a: 'Após finalizar atividade, no resumo → "Exportar GPX". O arquivo .gpx é compatível com Strava, Garmin Connect, etc.',
  },
  {
    q: 'Apaguei minha conta — posso recuperar?',
    a: 'Anonimização é irreversível. Suas atividades públicas permanecem com nome anônimo. Crie uma nova conta para recomeçar.',
  },
];

export default function HelpScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<number | null>(0);

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
        <Text style={styles.title}>Central de Ajuda</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Perguntas frequentes sobre o Sync. Se não encontrou o que procurava, mande sua dúvida pelo formulário de feedback.
        </Text>

        {FAQ.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faq}
            onPress={() => setExpanded(expanded === i ? null : i)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.q}>{item.q}</Text>
              <Ionicons
                name={expanded === i ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.dark.secondaryText}
              />
            </View>
            {expanded === i && <Text style={styles.a}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        <View style={styles.contactBox}>
          <Ionicons name="mail" size={28} color="#FF6B35" />
          <Text style={styles.contactTitle}>Ainda precisa de ajuda?</Text>
          <Text style={styles.contactText}>
            Mande um email pra <Text style={styles.link}>support@sync.app</Text> ou use o "Reportar problema" nas Configurações.
          </Text>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL('mailto:support@sync.app').catch(() => {})}
          >
            <Text style={styles.contactBtnText}>Enviar email</Text>
          </TouchableOpacity>
        </View>

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
  intro: { color: colors.dark.secondaryText, fontSize: 14, marginBottom: spacing.lg, lineHeight: 20 },
  faq: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  q: { color: colors.dark.text, fontSize: 14, fontWeight: '700', flex: 1, paddingRight: 8 },
  a: { color: colors.dark.text, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  contactBox: {
    marginTop: spacing.xl,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  contactTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
  contactText: {
    color: colors.dark.text,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  link: { color: '#FF6B35', fontWeight: '700' },
  contactBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: spacing.md,
  },
  contactBtnText: { color: '#fff', fontWeight: '800' },
});
