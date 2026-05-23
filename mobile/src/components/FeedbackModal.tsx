// Modal de feedback — bug / sugestão / suporte / rating do app
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { showToast } from './ui/Toast';
import { colors, fontSize, spacing, borderRadius } from '../theme';

interface Props {
  visible: boolean;
  type: 'bug' | 'suggestion' | 'rating' | 'support';
  onClose: () => void;
}

const TYPE_CONFIG = {
  bug: { title: 'Reportar problema', icon: 'bug', color: '#F87171', placeholder: 'Descreva o problema. O que aconteceu? O que esperava?' },
  suggestion: { title: 'Sugestão', icon: 'bulb', color: '#FCD34D', placeholder: 'Que melhoria você gostaria de ver no Sync?' },
  rating: { title: 'Avaliar o Sync', icon: 'star', color: '#FF6B35', placeholder: 'Conta pra gente o que está achando do app!' },
  support: { title: 'Falar com suporte', icon: 'help-circle', color: '#3B82F6', placeholder: 'Como podemos te ajudar?' },
} as const;

export default function FeedbackModal({ visible, type, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [stars, setStars] = useState(0);
  const [sending, setSending] = useState(false);
  const cfg = TYPE_CONFIG[type];

  const reset = () => {
    setMessage('');
    setStars(0);
  };

  const handleSubmit = async () => {
    if (message.trim().length < 3) {
      showToast('Mensagem muito curta', 'error');
      return;
    }
    if (type === 'rating' && stars === 0) {
      showToast('Dê uma nota antes de enviar', 'error');
      return;
    }
    setSending(true);
    try {
      await api.post('/feedback', {
        type,
        message: message.trim(),
        rating: type === 'rating' ? stars : undefined,
      });
      showToast('Obrigado! Recebemos seu feedback 🙏', 'success');
      reset();
      onClose();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Erro ao enviar', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconWrap}>
              <View style={[styles.iconCircle, { backgroundColor: cfg.color + '22' }]}>
                <Ionicons name={cfg.icon as any} size={32} color={cfg.color} />
              </View>
            </View>
            <Text style={styles.title}>{cfg.title}</Text>

            {type === 'rating' && (
              <>
                <Text style={styles.subtitle}>Que nota você dá ao Sync?</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setStars(s)} hitSlop={6}>
                      <Ionicons
                        name={stars >= s ? 'star' : 'star-outline'}
                        size={42}
                        color={stars >= s ? '#FCD34D' : '#3A3A3F'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Mensagem</Text>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder={cfg.placeholder}
              placeholderTextColor={colors.dark.secondaryText}
              multiline
              maxLength={2000}
            />
            <Text style={styles.charCount}>{message.length}/2000</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={sending}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[cfg.color, cfg.color + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitInner}
                >
                  <Text style={styles.submitText}>{sending ? 'Enviando…' : 'Enviar'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0A0A0F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: spacing.md,
  },
  iconWrap: { alignItems: 'center', marginBottom: spacing.sm },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: colors.dark.secondaryText, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.md },
  label: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: '#fff',
    minHeight: 120,
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  charCount: { color: colors.dark.secondaryText, fontSize: 11, textAlign: 'right', marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelText: { color: colors.dark.secondaryText, fontWeight: '700' },
  submitBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  submitInner: { paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
