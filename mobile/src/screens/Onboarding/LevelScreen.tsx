import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboardingStore';
import { SportLevel } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import ScreenContainer from '../../components/layout/ScreenContainer';
import ProgressBar from '../../components/ui/ProgressBar';
import Button from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Level'>;
};

const LEVELS = [
  {
    id: SportLevel.BEGINNER,
    title: 'Iniciante',
    description: 'Estou comecando agora ou pratico ha pouco tempo',
    icon: 'leaf-outline' as const,
  },
  {
    id: SportLevel.INTERMEDIATE,
    title: 'Intermediario',
    description: 'Pratico regularmente e tenho experiencia',
    icon: 'flame-outline' as const,
  },
  {
    id: SportLevel.ADVANCED,
    title: 'Avancado',
    description: 'Alto nivel de experiencia e performance',
    icon: 'trophy-outline' as const,
  },
];

export default function LevelScreen({ navigation }: Props) {
  const { level, setLevel } = useOnboardingStore();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <ProgressBar current={2} total={6} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Qual seu nivel?</Text>
        <Text style={styles.subtitle}>Selecione o que melhor te descreve</Text>

        {LEVELS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, level === item.id && styles.cardSelected]}
            onPress={() => setLevel(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.icon}
              size={32}
              color={level === item.id ? colors.white : colors.primary}
            />
            <View style={styles.cardText}>
              <Text
                style={[
                  styles.cardTitle,
                  level === item.id && styles.cardTitleSelected,
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  level === item.id && styles.cardDescSelected,
                ]}
              >
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        title="Continuar"
        onPress={() => navigation.navigate('Objectives')}
        style={styles.button}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  content: {
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  cardTitleSelected: {
    color: colors.white,
  },
  cardDesc: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    marginTop: 2,
  },
  cardDescSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  button: {
    marginBottom: spacing.lg,
  },
});
