// Central de Segurança — contato de emergência, SOS com localização,
// compartilhar localização ao vivo e dicas de encontro seguro.
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Share, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { showToast } from '../../components/ui/Toast';
import { getCurrentLocation } from '../../services/location.service';

const STORAGE_KEY = '@sync:emergency-contact';

const SAFETY_TIPS = [
  { icon: 'people-outline', text: 'Marque o primeiro encontro sempre em local público e movimentado.' },
  { icon: 'megaphone-outline', text: 'Avise um amigo ou familiar para onde está indo e com quem.' },
  { icon: 'lock-closed-outline', text: 'Não compartilhe dados pessoais (endereço, banco) no chat.' },
  { icon: 'navigate-outline', text: 'Vá e volte por conta própria; não aceite carona de quem acabou de conhecer.' },
  { icon: 'flag-outline', text: 'Confie no seu instinto. Se algo parecer errado, saia e denuncie pelo app.' },
];

export default function SafetyCenterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((s) => {
      if (s) {
        try {
          const c = JSON.parse(s);
          setSaved(c); setName(c.name || ''); setPhone(c.phone || '');
        } catch {}
      }
    });
  }, []);

  const saveContact = async () => {
    if (!name.trim() || !phone.trim()) {
      showToast('Preencha nome e telefone do contato.', 'error');
      return;
    }
    const c = { name: name.trim(), phone: phone.replace(/[^0-9+]/g, '') };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setSaved(c);
    showToast('Contato de emergência salvo!', 'success');
  };

  // Monta link de mapa a partir da localização atual
  const buildLocationLink = async (): Promise<string | null> => {
    try {
      const loc = await getCurrentLocation();
      return `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
    } catch {
      showToast('Não consegui pegar sua localização. Libere o GPS e tente de novo.', 'error');
      return null;
    }
  };

  const shareLiveLocation = async () => {
    const link = await buildLocationLink();
    if (!link) return;
    try {
      await Share.share({
        message: `📍 Estou compartilhando minha localização pelo Sync: ${link}`,
      });
    } catch {}
  };

  const sendSOS = async () => {
    const link = await buildLocationLink();
    if (!link) return;
    const msg = `🆘 PRECISO DE AJUDA. Esta é minha localização agora: ${link}`;
    // Tenta WhatsApp direto pro contato; senão abre o compartilhamento padrão.
    if (saved?.phone) {
      const wa = `https://wa.me/${saved.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
      const ok = await Linking.canOpenURL(wa).catch(() => false);
      if (ok) { Linking.openURL(wa).catch(() => {}); return; }
    }
    try { await Share.share({ message: msg }); } catch {}
  };

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
        <Text style={styles.title}>Central de Segurança</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Sua segurança em primeiro lugar. Configure um contato de confiança e use o
          botão de emergência se precisar.
        </Text>

        {/* SOS */}
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={sendSOS}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Enviar alerta de emergência com minha localização"
        >
          <Ionicons name="alert-circle" size={26} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>Enviar SOS</Text>
            <Text style={styles.sosSub}>Manda sua localização atual pro contato de emergência</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={shareLiveLocation}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar minha localização ao vivo"
        >
          <Ionicons name="location" size={20} color="#FF6B35" />
          <Text style={styles.shareText}>Compartilhar minha localização</Text>
        </TouchableOpacity>

        {/* Contato de emergência */}
        <Text style={styles.sectionTitle}>Contato de emergência</Text>
        {saved && (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.savedText}>{saved.name} · {saved.phone}</Text>
          </View>
        )}
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Maria (mãe)"
          placeholderTextColor={colors.dark.secondaryText}
        />
        <Text style={styles.label}>Telefone (com DDD)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Ex: 11999998888"
          placeholderTextColor={colors.dark.secondaryText}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveContact} accessibilityRole="button" accessibilityLabel="Salvar contato">
          <Text style={styles.saveBtnText}>Salvar contato</Text>
        </TouchableOpacity>

        {/* Dicas */}
        <Text style={styles.sectionTitle}>Dicas para encontros seguros</Text>
        {SAFETY_TIPS.map((tip, i) => (
          <View key={i} style={styles.tip}>
            <Ionicons name={tip.icon as any} size={20} color="#FF6B35" />
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
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
  sosBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#E11D48', borderRadius: borderRadius.lg, padding: spacing.lg,
    shadowColor: '#E11D48', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  sosTitle: { color: '#fff', fontWeight: '900', fontSize: fontSize.lg },
  sosSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.md, paddingVertical: 14, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.4)', backgroundColor: 'rgba(255,107,53,0.08)',
  },
  shareText: { color: '#FF6B35', fontWeight: '700', fontSize: 14 },
  sectionTitle: {
    color: colors.dark.text, fontWeight: '800', fontSize: fontSize.md,
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md,
    backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: borderRadius.md, padding: spacing.sm,
  },
  savedText: { color: colors.dark.text, fontSize: 13, fontWeight: '600' },
  label: { color: colors.dark.secondaryText, fontSize: 12, marginBottom: 6, marginTop: spacing.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.dark.text, fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#FF6B35', borderRadius: 999, paddingVertical: 14,
    alignItems: 'center', marginTop: spacing.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  tip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tipText: { color: colors.dark.text, fontSize: 13, lineHeight: 19, flex: 1 },
});
