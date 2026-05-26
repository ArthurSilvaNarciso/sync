import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OBJECTIVES } from '../../types';
import { colors, fontSize, spacing } from '../../theme';
import ScreenContainer from '../../components/layout/ScreenContainer';
import ProgressBar from '../../components/ui/ProgressBar';
import Chip from '../../components/ui/Chip';
import Button from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Objectives'>;
};

export default function ObjectivesScreen({ navigation }: Props) {
  const { objectives, setObjectives } = useOnboardingStore();

  const toggle = (id: string) => {
    if (objectives.includes(id)) {
      setObjectives(objectives.filter((o) => o !== id));
    } else {
      setObjectives([...objectives, id]);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <ProgressBar current={3} total={6} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Quais seus objetivos?</Text>
        <Text style={styles.subtitle}>
          Pode combinar mais de um objetivo
        </Text>

        <View style={styles.grid}>
          {OBJECTIVES.map((obj) => (
            <Chip
              key={obj.id}
              label={obj.label}
              selected={objectives.includes(obj.id)}
              onPress={() => toggle(obj.id)}
            />
          ))}
        </View>
      </View>

      <Button
        title="Continuar"
        onPress={() => navigation.navigate('Availability')}
        disabled={objectives.length === 0}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  button: {
    marginBottom: spacing.lg,
  },
});
