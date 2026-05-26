import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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

  const toggleSport = (id: string) => {
    if (sports.includes(id)) {
      setSports(sports.filter((s) => s !== id));
    } else {
      setSports([...sports, id]);
    }
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
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  button: {
    marginBottom: spacing.lg,
  },
});
