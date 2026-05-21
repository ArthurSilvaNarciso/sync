import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboardingStore';
import { SPORTS } from '../../types';
import { colors, fontSize, spacing } from '../../theme';
import ScreenContainer from '../../components/layout/ScreenContainer';
import ProgressBar from '../../components/ui/ProgressBar';
import Chip from '../../components/ui/Chip';
import Button from '../../components/ui/Button';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Sports'>;
};

export default function SportsScreen({ navigation }: Props) {
  const { sports, setSports } = useOnboardingStore();

  const toggleSport = (id: string) => {
    if (sports.includes(id)) {
      setSports(sports.filter((s) => s !== id));
    } else {
      setSports([...sports, id]);
    }
  };

  return (
    <ScreenContainer>
      <ProgressBar current={1} total={5} />

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
  button: {
    marginBottom: spacing.lg,
  },
});
