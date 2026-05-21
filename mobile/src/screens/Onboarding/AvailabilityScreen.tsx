import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboardingStore';
import { AVAILABILITY } from '../../types';
import { colors, fontSize, spacing } from '../../theme';
import ScreenContainer from '../../components/layout/ScreenContainer';
import ProgressBar from '../../components/ui/ProgressBar';
import Chip from '../../components/ui/Chip';
import Button from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Availability'>;
};

export default function AvailabilityScreen({ navigation }: Props) {
  const { availability, setAvailability } = useOnboardingStore();

  const toggle = (id: string) => {
    if (availability.includes(id)) {
      setAvailability(availability.filter((a) => a !== id));
    } else {
      setAvailability([...availability, id]);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <ProgressBar current={4} total={5} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Quando voce treina?</Text>
        <Text style={styles.subtitle}>
          Selecione seus horarios de preferencia
        </Text>

        <View style={styles.grid}>
          {AVAILABILITY.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={availability.includes(item.id)}
              onPress={() => toggle(item.id)}
            />
          ))}
        </View>
      </View>

      <Button
        title="Continuar"
        onPress={() => navigation.navigate('Location')}
        disabled={availability.length === 0}
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
