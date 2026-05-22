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
import { authService } from '../../services/auth.service';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { heroImages } from '../../theme/images';
import Input from '../../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { showToast } from '../../components/ui/Toast';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const ACCENT = '#FF6B35';

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const login = useAuthStore((s) => s.login);
  const setAuth = useAuthStore((s) => s.setAuth);

  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideY, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  const isFormValid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  const handleLogin = async () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email inválido';
    if (!password) newErrors.password = 'Senha obrigatória';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const first = Object.values(newErrors)[0];
      if (first) showToast(first, 'error');
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error: any) {
      const msg = error.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(' • ') : msg;
      showToast(detail || 'Email ou senha incorretos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      showToast('Digite seu email primeiro.', 'info');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      showToast('Se o email estiver cadastrado, você receberá instruções.', 'success');
    } catch {
      showToast('Se o email estiver cadastrado, você receberá instruções.', 'info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Hero background com gradient overlay */}
      <ImageBackground
        source={{ uri: heroImages.runnerCity }}
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
                <Text style={styles.title}>Bem-vindo{'\n'}<Text style={{ color: ACCENT }}>de volta.</Text></Text>
                <Text style={styles.subtitle}>
                  Entre pra continuar sua jornada.
                </Text>
              </View>

              <View style={styles.form}>
                <Input
                  label="Email"
                  placeholder="seu@email.com"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />
                <Input
                  label="Senha"
                  placeholder="Sua senha"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
                  isPassword
                  error={errors.password}
                />
              </View>

              <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
              </TouchableOpacity>

              {/* CTA principal gradient laranja */}
              <Pressable
                onPress={handleLogin}
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
                    <Text style={styles.primaryBtnText}>Entrando…</Text>
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Entrar</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.registerLink}
              >
                <Text style={styles.registerText}>
                  Não tem conta?{' '}
                  <Text style={styles.registerTextBold}>Criar agora</Text>
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
    height: 360,
  },
  scroll: {
    flexGrow: 1,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 440,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  titleBlock: {
    marginTop: 120,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.sm,
  },
  form: {
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    fontSize: fontSize.sm,
    color: ACCENT,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  registerText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
  },
  registerTextBold: {
    color: ACCENT,
    fontWeight: '700',
  },
});
