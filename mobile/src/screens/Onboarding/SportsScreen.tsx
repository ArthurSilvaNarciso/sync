import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { SPORTS } from '../../types';
import { colors, fontSize, spacing } from '../../theme';
import ScreenContainer from '../../components/layout/ScreenContainer';
import ProgressBar from '../../components/ui/ProgressBar';
import Chip from '../../components/ui/Chip';
import Button from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Sports'>;
};

export default function SportsScreen({ navigation }: Props) {
  const { sports, setSports } = useOnboardingStore();
  const logout = useAuthStore((s) => s.logout);
  const [customSport, setCustomSport] = useState('');

  const toggleSport = (id: string) => {
    if (sports.includes(id)) {
      setSports(sports.filter((s) => s !== id));
    } else {
      setSports([...sports, id]);
    }
  };

  // Esportes personalizados = os que estão no store mas não estão na lista padrão
  const customSports = sports.filter((s) => !SPORTS.some((sp) => sp.id === s));

  const addCustomSport = () => {
    const value = customSport.trim();
    if (value.length < 2) return;
    // evita duplicar (case-insensitive)
    const exists = sports.some((s) => s.toLowerCase() === value.toLowerCase()) ||
      SPORTS.some((sp) => sp.label.toLowerCase() === value.toLowerCase());
    if (!exists) setSports([...sports, value]);
    setCustomSport('');
  };

  return (
    <ScreenContainer>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={logout} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <ProgressBar current={1} total={6} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.title}>Quais esportes voce pratica?</Text>
        <Text style={styles.subtitle}>
          Selecione um ou mais esportes
        </Text>

        <View style={styles.grid}>
          {SPORTS.map((sport) => (
            <Chip
              key={sport.id}
              label={sport.label}
              selected={sports.includes(sport.id)}
              onPress={() => toggleSport(sport.id)}
            />
          ))}
          {/* Esportes personalizados adicionados pelo usuário */}
          {customSports.map((s) => (
            <Chip
              key={s}
              label={s}
              selected
              onPress={() => toggleSport(s)}
            />
          ))}
        </View>

        {/* Adicionar "Outro" esporte/atividade */}
        <Text style={styles.otherLabel}>Não achou o seu? Adicione:</Text>
        <View style={styles.customRow}>
          <TextInput
            style={[styles.customInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
            value={customSport}
            onChangeText={setCustomSport}
            placeholder="Ex: Escalada, Surf, Boxe..."
            placeholderTextColor={colors.secondaryText}
            maxLength={30}
            onSubmitEditing={addCustomSport}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, customSport.trim().length < 2 && { opacity: 0.4 }]}
            onPress={addCustomSport}
            disabled={customSport.trim().length < 2}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Button
        title="Continuar"
        onPress={() => navigation.navigate('Level')}
        disabled={sports.length === 0}
        style={styles.button}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  otherLabel: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginBottom: spacing.lg,
  },
});
