import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import ScreenContainer from '../../components/layout/ScreenContainer';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const register = useAuthStore((s) => s.register);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome obrigatorio';
    else if (name.trim().length < 2) newErrors.name = 'Nome muito curto';
    if (!email.trim()) newErrors.email = 'Email obrigatorio';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email invalido';
    if (password.length < 6) newErrors.password = 'Minimo 6 caracteres';
    if (password !== confirmPassword)
      newErrors.confirmPassword = 'Senhas nao conferem';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 6 &&
    password === confirmPassword;

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, confirmPassword);
    } catch (error: any) {
      Alert.alert(
        'Erro ao criar conta',
        error.response?.data?.message || 'Nao foi possivel criar sua conta. Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, label: '', color: colors.border };
    if (password.length < 6) return { level: 1, label: 'Fraca', color: colors.error };
    if (password.length < 8) return { level: 2, label: 'Media', color: colors.warning };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { level: 4, label: 'Forte', color: colors.success };
    return { level: 3, label: 'Boa', color: colors.blueAccent };
  };

  const strength = getPasswordStrength();

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para encontrar parceiros de treino
          </Text>

          <View style={styles.form}>
            <Input
              label="Nome"
              placeholder="Seu nome completo"
              value={name}
              onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
              error={errors.name}
              autoCapitalize="words"
            />
            <Input
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Senha"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
              error={errors.password}
              isPassword
            />

            {/* Password strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor: i <= strength.level ? strength.color : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}

            <Input
              label="Confirmar senha"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: '' })); }}
              error={errors.confirmPassword}
              isPassword
            />

            {/* Password match indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={password === confirmPassword ? colors.success : colors.error}
                />
                <Text style={[styles.matchText, { color: password === confirmPassword ? colors.success : colors.error }]}>
                  {password === confirmPassword ? 'Senhas conferem' : 'Senhas nao conferem'}
                </Text>
              </View>
            )}
          </View>

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <Ionicons
              name={acceptedTerms ? 'checkbox' : 'square-outline'}
              size={22}
              color={acceptedTerms ? colors.primary : colors.secondaryText}
            />
            <Text style={styles.termsText}>
              Li e aceito os{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Alert.alert('Termos de Uso', 'Os termos de uso do Sync estarao disponiveis em breve.')}
              >
                termos de uso
              </Text>
              {' '}e{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Alert.alert('Politica de Privacidade', 'Respeitamos sua privacidade conforme a LGPD.')}
              >
                politica de privacidade
              </Text>
            </Text>
          </TouchableOpacity>

          <Button
            title="Criar conta"
            onPress={handleRegister}
            disabled={!isFormValid}
            loading={loading}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>
              Ja tem conta?{' '}
              <Text style={styles.loginTextBold}>Fazer login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.md,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  matchText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  termsText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loginText: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
  },
  loginTextBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
