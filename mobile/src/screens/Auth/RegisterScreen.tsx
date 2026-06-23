import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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
import { showToast } from '../../components/ui/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const ACCENT = '#FF6B35';

// Valida CPF pelos dígitos verificadores (rejeita inventado/repetido).
function isValidCPF(value: string): boolean {
  const cpf = (value || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [cpf, setCpf] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
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
    if (password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
    else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      newErrors.password = 'Senha precisa de letras e números';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Senhas não conferem';
    if (!isValidCPF(cpf)) newErrors.cpf = 'CPF inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    password === confirmPassword &&
    isValidCPF(cpf) &&
    acceptedTerms;

  const handleRegister = async () => {
    if (!validate()) {
      const firstError = Object.values(errors)[0];
      if (firstError) showToast(firstError, 'error');
      else showToast('Verifique os dados do formulário', 'error');
      return;
    }
    if (!acceptedTerms) {
      showToast('Aceite os termos pra continuar.', 'error');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, confirmPassword, {
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        gender: gender || undefined,
        cpf: cpf.replace(/\D/g, '') || undefined,
      });
      // Popup de sucesso antes de cair na seleção de perguntas (onboarding)
      showToast('Conta criada com sucesso! 🎉 Vamos personalizar seu perfil', 'success');
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(' • ') : msg;
      if (status === 409) {
        // E-mail já cadastrado (backend é vago de propósito p/ anti-enumeração).
        // Orientamos o usuário legítimo a entrar em vez de só dizer "dados inválidos".
        showToast('Esse e-mail pode já ter conta. Tente fazer login ou recuperar a senha.', 'error');
      } else if (!error.response) {
        // Sem resposta = falha de rede/servidor fora do ar
        showToast('Sem conexão com o servidor. Verifique sua internet e tente de novo.', 'error');
      } else {
        showToast(detail || 'Não foi possível criar sua conta.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, label: '', color: 'rgba(255,255,255,0.15)' };
    if (password.length < 8) return { level: 1, label: 'Fraca (mín 8)', color: colors.error };
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      return { level: 2, label: 'Precisa letras + números', color: colors.warning };
    if (/[A-Z]/.test(password) && password.length >= 10) return { level: 4, label: 'Forte', color: colors.success };
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
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -24}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={[styles.centerStage, { paddingTop: Math.max(insets.top + 16, 56) }]}>
            <Animated.View
              style={[styles.content, { opacity: fade, transform: [{ translateY: slideY }] }]}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
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
                  placeholder="Mínimo 8 caracteres"
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

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Peso (kg)"
                      placeholder="Ex: 70"
                      value={weightKg}
                      onChangeText={(v) => setWeightKg(v.replace(/[^0-9.,]/g, ''))}
                      keyboardType="decimal-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Altura (cm)"
                      placeholder="Ex: 175"
                      value={heightCm}
                      onChangeText={(v) => setHeightCm(v.replace(/[^0-9.,]/g, ''))}
                      keyboardType="decimal-pad"
                      maxLength={5}
                    />
                  </View>
                </View>

                <Input
                  label="CPF"
                  placeholder="Só números — usado para sua segurança"
                  value={cpf}
                  onChangeText={(v) => { setCpf(v.replace(/\D/g, '').slice(0, 11)); setErrors((e) => ({ ...e, cpf: '' })); }}
                  keyboardType="number-pad"
                  maxLength={11}
                  error={errors.cpf}
                />

                <Text style={styles.genderLabel}>Sexo</Text>
                <View style={styles.genderRow}>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(gender === g ? '' : g)}
                      style={[
                        styles.genderPill,
                        gender === g && { backgroundColor: ACCENT, borderColor: ACCENT },
                      ]}
                    >
                      <Text style={[styles.genderPillText, gender === g && { color: '#fff', fontWeight: '700' }]}>
                        {g === 'male' ? 'Masculino' : g === 'female' ? 'Feminino' : 'Outro'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.termsRow}>
                <TouchableOpacity
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  hitSlop={10}
                  style={{ paddingRight: 6 }}
                >
                  <Ionicons
                    name={acceptedTerms ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={acceptedTerms ? ACCENT : 'rgba(255,255,255,0.5)'}
                  />
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  Aceito os{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => navigation.navigate('Terms')}
                  >
                    termos de uso
                  </Text>
                  {' '}e{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => navigation.navigate('Privacy')}
                  >
                    privacidade
                  </Text>
                </Text>
              </View>

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
    paddingBottom: spacing.xl,
  },
  content: { width: '100%', maxWidth: 440 },
  backButton: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleBlock: { marginTop: spacing.lg, marginBottom: spacing.lg },
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
  rowInputs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  genderLabel: {
    fontSize: fontSize.sm, fontWeight: '600',
    color: 'rgba(255,255,255,0.7)', marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  genderRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  genderPill: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    minHeight: 44,
  },
  genderPillText: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.6)' },
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
