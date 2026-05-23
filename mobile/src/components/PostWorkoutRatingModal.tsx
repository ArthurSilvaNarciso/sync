// Modal pós-treino estilo Adidas Running Club.
// Pergunta: como se sentiu, satisfação, esforço, dor, tipo de treino.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing, borderRadius } from '../theme';
import api from '../services/api';
import { showToast } from './ui/Toast';

interface Props {
  visible: boolean;
  activityId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

const EMOJI_SCALE = [
  { value: 1, emoji: '😩', label: 'Péssimo' },
  { value: 2, emoji: '😕', label: 'Ruim' },
  { value: 3, emoji: '😐', label: 'OK' },
  { value: 4, emoji: '😊', label: 'Bom' },
  { value: 5, emoji: '🤩', label: 'Ótimo' },
];

const RPE_SCALE = [
  { value: 1, label: 'Muito leve' },
  { value: 3, label: 'Leve' },
  { value: 5, label: 'Moderado' },
  { value: 7, label: 'Forte' },
  { value: 9, label: 'Muito forte' },
  { value: 10, label: 'Máximo' },
];

const PAIN_SCALE = [
  { value: 0, label: 'Nenhuma', color: '#10B981' },
  { value: 1, label: 'Leve', color: '#84CC16' },
  { value: 2, label: 'Moderada', color: '#FCD34D' },
  { value: 3, label: 'Forte', color: '#FB923C' },
  { value: 4, label: 'Muito forte', color: '#EF4444' },
  { value: 5, label: 'Insuportável', color: '#991B1B' },
];

const WORKOUT_TYPES = [
  { id: 'easy', label: 'Easy', icon: 'leaf-outline', color: '#10B981' },
  { id: 'tempo', label: 'Tempo', icon: 'speedometer-outline', color: '#FCD34D' },
  { id: 'interval', label: 'Intervalado', icon: 'pulse-outline', color: '#FF6B35' },
  { id: 'long', label: 'Long run', icon: 'trail-sign-outline', color: '#3B82F6' },
  { id: 'recovery', label: 'Recovery', icon: 'water-outline', color: '#A78BFA' },
  { id: 'race', label: 'Prova', icon: 'trophy-outline', color: '#F87171' },
];

const WEATHER_FELT = [
  { id: 'sunny', icon: 'sunny', label: 'Sol' },
  { id: 'cloudy', icon: 'cloud', label: 'Nublado' },
  { id: 'rainy', icon: 'rainy', label: 'Chuva' },
  { id: 'windy', icon: 'flag', label: 'Vento' },
  { id: 'cold', icon: 'snow', label: 'Frio' },
  { id: 'hot', icon: 'flame', label: 'Calor' },
];

export default function PostWorkoutRatingModal({ visible, activityId, onClose, onSaved }: Props) {
  const [energy, setEnergy] = useState<number | null>(null);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(0);
  const [workoutType, setWorkoutType] = useState<string | null>(null);
  const [weatherFelt, setWeatherFelt] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!activityId) {
      showToast('Atividade inválida', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/activities/${activityId}/rating`, {
        energy,
        satisfaction,
        rpe,
        pain,
        workoutType,
        weatherFelt,
        notes,
      });
      showToast('Avaliação salva!', 'success');
      onSaved?.();
      onClose();
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    onSaved?.();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={skip}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Como foi seu treino?</Text>
            <Text style={styles.subtitle}>Avalie pra acompanhar sua evolução</Text>

            {/* Energy */}
            <Text style={styles.sectionLabel}>Como você se sentiu?</Text>
            <View style={styles.emojiRow}>
              {EMOJI_SCALE.map((e) => (
                <TouchableOpacity
                  key={e.value}
                  style={[styles.emojiBtn, energy === e.value && styles.emojiBtnActive]}
                  onPress={() => setEnergy(e.value)}
                >
                  <Text style={styles.emoji}>{e.emoji}</Text>
                  <Text style={[styles.emojiLabel, energy === e.value && { color: '#fff' }]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Satisfaction */}
            <Text style={styles.sectionLabel}>Gostou do treino?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setSatisfaction(s)} hitSlop={6}>
                  <Ionicons
                    name={(satisfaction || 0) >= s ? 'star' : 'star-outline'}
                    size={36}
                    color={(satisfaction || 0) >= s ? '#FCD34D' : '#3A3A3F'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* RPE */}
            <Text style={styles.sectionLabel}>Esforço percebido (RPE)</Text>
            <View style={styles.scaleRow}>
              {RPE_SCALE.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.scaleBtn, rpe === s.value && { backgroundColor: '#FF6B35' }]}
                  onPress={() => setRpe(s.value)}
                >
                  <Text style={[styles.scaleValue, rpe === s.value && { color: '#fff' }]}>
                    {s.value}
                  </Text>
                  <Text style={[styles.scaleLabel, rpe === s.value && { color: '#fff' }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pain */}
            <Text style={styles.sectionLabel}>Sentiu alguma dor?</Text>
            <View style={styles.painRow}>
              {PAIN_SCALE.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.painBtn,
                    pain === p.value && { backgroundColor: p.color, borderColor: p.color },
                  ]}
                  onPress={() => setPain(p.value)}
                >
                  <Text
                    style={[
                      styles.painValue,
                      pain === p.value && { color: '#fff' },
                    ]}
                  >
                    {p.value}
                  </Text>
                  <Text
                    style={[
                      styles.painLabel,
                      pain === p.value && { color: '#fff' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Workout Type */}
            <Text style={styles.sectionLabel}>Tipo de treino</Text>
            <View style={styles.typesGrid}>
              {WORKOUT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeBtn,
                    workoutType === t.id && { backgroundColor: t.color, borderColor: t.color },
                  ]}
                  onPress={() => setWorkoutType(t.id)}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={18}
                    color={workoutType === t.id ? '#fff' : t.color}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      workoutType === t.id && { color: '#fff' },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Weather */}
            <Text style={styles.sectionLabel}>Como estava o tempo?</Text>
            <View style={styles.weatherRow}>
              {WEATHER_FELT.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.weatherBtn,
                    weatherFelt === w.id && { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
                  ]}
                  onPress={() => setWeatherFelt(w.id)}
                >
                  <Ionicons
                    name={w.icon as any}
                    size={20}
                    color={weatherFelt === w.id ? '#fff' : colors.dark.text}
                  />
                  <Text
                    style={[
                      styles.weatherLabel,
                      weatherFelt === w.id && { color: '#fff' },
                    ]}
                  >
                    {w.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.sectionLabel}>Notas (opcional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Como foi o treino? Algum detalhe importante?"
              placeholderTextColor={colors.dark.secondaryText}
              multiline
              maxLength={500}
            />

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.skipBtn} onPress={skip}>
                <Text style={styles.skipBtnText}>Pular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={save}
                disabled={saving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#FF6B35', '#FF4500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBtnInner}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? 'Salvando…' : 'Salvar avaliação'}
                  </Text>
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
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.dark.secondaryText, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg },
  sectionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  emojiBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  emoji: { fontSize: 28 },
  emojiLabel: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    marginTop: 4,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  scaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scaleBtn: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  scaleValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
  scaleLabel: { fontSize: 10, color: colors.dark.secondaryText, marginTop: 2 },
  painRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  painBtn: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  painValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
  painLabel: { fontSize: 10, color: colors.dark.secondaryText, marginTop: 2 },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  typeLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  weatherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weatherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  weatherLabel: { color: '#fff', fontWeight: '600', fontSize: 12 },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: '#fff',
    minHeight: 80,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipBtnText: { color: colors.dark.secondaryText, fontWeight: '700' },
  saveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveBtnInner: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
