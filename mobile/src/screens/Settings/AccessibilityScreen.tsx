// Central de Acessibilidade — recursos pra pessoas com deficiência e afins.
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Platform, AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { useAccessibilityStore } from '../../store/accessibilityStore';
import { speak } from '../../services/audio-coach.service';
import { showToast } from '../../components/ui/Toast';

const ACCENT = '#FF6B35';

type RowKey = 'highContrast' | 'largeText' | 'reduceMotion' | 'hapticsEnabled' | 'audioCues' | 'libras';

interface RowDef {
  key: RowKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  color: string;
  webOnly?: boolean;
}

const SECTIONS: { title: string; icon: keyof typeof Ionicons.glyphMap; rows: RowDef[] }[] = [
  {
    title: 'Visão',
    icon: 'eye',
    rows: [
      { key: 'highContrast', icon: 'contrast', title: 'Alto contraste', desc: 'Aumenta o contraste das cores pra facilitar a leitura.', color: '#2E7BFF' },
      { key: 'largeText', icon: 'text', title: 'Texto e UI maiores', desc: 'Amplia o conteúdo do app. No celular, respeita o tamanho do sistema.', color: '#8B5CFF' },
    ],
  },
  {
    title: 'Movimento',
    icon: 'pulse',
    rows: [
      { key: 'reduceMotion', icon: 'contract', title: 'Reduzir movimento', desc: 'Diminui ou desliga animações (ajuda em sensibilidade vestibular).', color: '#4ADE80' },
    ],
  },
  {
    title: 'Áudio & Tato',
    icon: 'volume-high',
    rows: [
      { key: 'audioCues', icon: 'megaphone', title: 'Narração por voz', desc: 'Anuncia eventos (km, fim de treino, match) em voz alta.', color: '#FF6B35' },
      { key: 'hapticsEnabled', icon: 'phone-portrait', title: 'Vibração (háptico)', desc: 'Feedback por vibração ao tocar e em conquistas.', color: '#F59E0B' },
    ],
  },
  {
    title: 'Língua de Sinais',
    icon: 'hand-left',
    rows: [
      { key: 'libras', icon: 'hand-left', title: 'VLibras (Libras)', desc: 'Tradução para Língua Brasileira de Sinais no site (web).', color: '#10B981', webOnly: true },
    ],
  },
];

export default function AccessibilityScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const store = useAccessibilityStore();

  const onToggle = (key: RowKey, value: boolean) => {
    store.set({ [key]: value } as any);
    // Anuncia a mudança pra leitores de tela
    const label = SECTIONS.flatMap((s) => s.rows).find((r) => r.key === key)?.title || '';
    AccessibilityInfo.announceForAccessibility?.(`${label} ${value ? 'ativado' : 'desativado'}`);
    if (key === 'libras' && value && Platform.OS !== 'web') {
      showToast('O VLibras funciona na versão web (navegador).', 'info');
    }
  };

  const readScreen = () => {
    speak(
      'Central de Acessibilidade do Sync. Aqui você ajusta alto contraste, tamanho do texto, ' +
      'redução de movimento, narração por voz, vibração e tradução em Libras. ' +
      'Use os botões para ativar cada recurso.',
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        style={[styles.header, { paddingTop: Math.max(insets.top + 10, 48) }]}
      >
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Acessibilidade</Text>
        <TouchableOpacity
          onPress={readScreen}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Ler esta tela em voz alta"
        >
          <Ionicons name="volume-high" size={20} color={ACCENT} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Ionicons name="accessibility" size={22} color={ACCENT} />
          <Text style={styles.introText}>
            O Sync é pra todo mundo. Ative os recursos que deixam o app do seu jeito.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={15} color={colors.secondaryText} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.rows.map((row) => {
              const value = (store as any)[row.key] as boolean;
              return (
                <View
                  key={row.key}
                  style={styles.row}
                  accessible
                  accessibilityRole="switch"
                  accessibilityState={{ checked: value }}
                  accessibilityLabel={`${row.title}. ${row.desc}`}
                >
                  <View style={[styles.rowIcon, { backgroundColor: row.color + '1F' }]}>
                    <Ionicons name={row.icon} size={20} color={row.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {row.title}
                      {row.webOnly ? '  ·  web' : ''}
                    </Text>
                    <Text style={styles.rowDesc}>{row.desc}</Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={(v) => onToggle(row.key, v)}
                    trackColor={{ false: '#3A3A45', true: ACCENT }}
                    thumbColor="#fff"
                    accessibilityLabel={row.title}
                  />
                </View>
              );
            })}
          </View>
        ))}

        <Text style={styles.footnote}>
          Dica: no celular, o Sync também funciona com o leitor de tela do sistema
          (TalkBack no Android, VoiceOver no iOS) e com o tamanho de fonte do aparelho.
        </Text>
      </ScrollView>
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
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
  intro: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: ACCENT + '12', borderWidth: 1, borderColor: ACCENT + '28',
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  introText: { flex: 1, color: colors.text, fontSize: fontSize.sm, lineHeight: 20 },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: '700', color: colors.secondaryText,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  rowDesc: { color: colors.secondaryText, fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  footnote: {
    color: colors.secondaryText, fontSize: fontSize.xs, lineHeight: 18,
    marginTop: spacing.md, textAlign: 'center',
  },
});
