import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageBackground,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { heroImages } from '../../theme/images';
import Input from '../../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const ACCENT = '#FF6B35';

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const register = useAuthStore((s) => s.register);

  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideY, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Nome obrigatório';
    else if (name.trim().length < 2) newErrors.name = 'Nome muito curto';
    if (!email.trim()) newErrors.email = 'Email obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email inválido';
    if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Senhas não conferem';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 6 &&
    password === confirmPassword &&
    acceptedTerms;

  const handleRegister = async () => {
    if (!validate()) return;
    if (!acceptedTerms) {
      Alert.alert('Termos', 'Aceite os termos pra continuar.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, confirmPassword);
    } catch (error: any) {
      Alert.alert(
        'Erro ao criar conta',
        error.response?.data?.message || 'Não foi possível criar sua conta.',
      );
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, label: '', color: colors.border };
    if (password.length < 6) return { level: 1, label: 'Fraca', color: colors.error };
    if (password.length < 8) return { level: 2, label: 'Média', color: colors.warning };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { level: 4, label: 'Forte', color: colors.success };
    return { level: 3, label: 'Boa', color: colors.blueAccent };
  };
  const strength = getPasswordStrength();

  return (
    <View style={styles.root}>
      <ImageBackground
        source={{ uri: heroImages.runnerSunrise }}
        style={styles.hero}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(10,10,15,0.3)', 'rgba(10,10,15,0.7)', '#0A0A0F']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.centerStage}>
            <Animated.View
              style={[styles.content, { opacity: fade, transform: [{ translateY: slideY }] }]}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>

              <View style={styles.titleBlock}>
                <Text style={styles.title}>Criar{'\n'}<Text style={{ color: ACCENT }}>sua conta.</Text></Text>
                <Text style={styles.subtitle}>
                  Encontre parceiros de treino na sua região.
                </Text>
              </View>

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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
                  error={errors.password}
                  isPassword
                />

                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthBar}>
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthSegment,
                            { backgroundColor: i <= strength.level ? strength.color : 'rgba(255,255,255,0.1)' },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
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

                {confirmPassword.length > 0 && (
                  <View style={styles.matchRow}>
                    <Ionicons
                      name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={password === confirmPassword ? colors.success : colors.error}
                    />
                    <Text style={[styles.matchText, { color: password === confirmPassword ? colors.success : colors.error }]}>
                      {password === confirmPassword ? 'Senhas conferem' : 'Senhas não conferem'}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <Ionicons
                  name={acceptedTerms ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={acceptedTerms ? ACCENT : 'rgba(255,255,255,0.5)'}
                />
                <Text style={styles.termsText}>
                  Aceito os{' '}
                  <Text style={styles.termsLink}>termos de uso</Text>
                  {' '}e{' '}
                  <Text style={styles.termsLink}>privacidade</Text>
                </Text>
              </TouchableOpacity>

              <Pressable
                onPress={handleRegister}
                disabled={!isFormValid || loading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (!isFormValid || loading) && { opacity: 0.5 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <LinearGradient
                  colors={[ACCENT, '#FF4500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtnInner}
                >
                  {loading ? (
                    <Text style={styles.primaryBtnText}>Criando…</Text>
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Criar conta</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.loginLink}
              >
                <Text style={styles.loginText}>
                  Já tem conta?{' '}
                  <Text style={styles.loginTextBold}>Fazer login</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0F' },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scroll: { flexGrow: 1 },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: spacing.xl,
  },
  content: { width: '100%', maxWidth: 440 },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleBlock: { marginTop: 80, marginBottom: spacing.lg },
  title: {
    fontSize: 32, fontWeight: '800', color: '#fff',
    lineHeight: 38, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.sm,
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  strengthRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: -spacing.sm, marginBottom: spacing.sm,
  },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: -spacing.sm, marginBottom: spacing.sm,
  },
  matchText: { fontSize: fontSize.xs, fontWeight: '500' },
  termsRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.lg,
  },
  termsText: {
    flex: 1, fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)', lineHeight: 20,
  },
  termsLink: { color: ACCENT, fontWeight: '600' },
  primaryBtn: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 18, elevation: 12,
  },
  primaryBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  primaryBtnText: {
    color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3,
  },
  loginLink: {
    alignItems: 'center', marginTop: spacing.xl, paddingBottom: spacing.lg,
  },
  loginText: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.6)' },
  loginTextBold: { color: ACCENT, fontWeight: '700' },
});
