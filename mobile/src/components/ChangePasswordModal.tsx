// Modal de alterar senha
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';
import { showToast } from './ui/Toast';
import { colors, fontSize, spacing, borderRadius } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setShow(false);
  };

  const handleSubmit = async () => {
    if (!current) return showToast('Digite sua senha atual', 'error');
    if (next.length < 8) return showToast('Nova senha precisa de 8+ caracteres', 'error');
    if (!/[a-zA-Z]/.test(next) || !/[0-9]/.test(next))
      return showToast('Senha precisa de letras e números', 'error');
    if (next !== confirm) return showToast('Senhas não conferem', 'error');

    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      showToast('Senha alterada! 🔒', 'success');
      reset();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(' • ') : msg;
      showToast(detail || 'Erro ao alterar senha', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Alterar senha</Text>
          <Text style={styles.subtitle}>
            Mínimo 8 caracteres com letras e números
          </Text>

          <Text style={styles.label}>Senha atual</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={current}
              onChangeText={setCurrent}
              placeholder="Digite sua senha atual"
              placeholderTextColor={colors.dark.secondaryText}
              secureTextEntry={!show}
            />
            <TouchableOpacity onPress={() => setShow((s) => !s)}>
              <Ionicons
                name={show ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.dark.secondaryText}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nova senha</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={next}
              onChangeText={setNext}
              placeholder="8+ chars, letras + números"
              placeholderTextColor={colors.dark.secondaryText}
              secureTextEntry={!show}
            />
          </View>

          <Text style={styles.label}>Confirmar nova senha</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repita a nova senha"
              placeholderTextColor={colors.dark.secondaryText}
              secureTextEntry={!show}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF6B35', '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitInner}
              >
                <Text style={styles.submitText}>{saving ? 'Salvando…' : 'Alterar senha'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  subtitle: {
    color: colors.dark.secondaryText,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  label: { color: colors.dark.text, fontSize: 13, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 14,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelText: { color: colors.dark.secondaryText, fontWeight: '700' },
  submitBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  submitInner: { paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
