import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ImageBackground,
  Animated,
  Easing,
  Dimensions,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Logo from '../../components/Logo';
import StravaLandingWeb from './StravaLandingWeb';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const SLIDES = [
  {
    uri: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=1400&q=80',
    caption: 'Corra com quem está perto',
  },
  {
    uri: 'https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=1400&q=80',
    caption: 'Descubra trilhas e eventos',
  },
  {
    uri: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80',
    caption: 'Treine em comunidade',
  },
];

const FEATURES = [
  { icon: 'people' as const, text: 'Encontre parceiros perto de você' },
  { icon: 'calendar' as const, text: 'Organize e participe de eventos' },
  { icon: 'fitness' as const, text: 'Acompanhe seu progresso em tempo real' },
];

// Features ricas para a landing page desktop
const LANDING_FEATURES = [
  {
    icon: 'flash' as const,
    title: 'Eventos relâmpago',
    desc: 'Crie um evento em 15min e notifique atletas no seu raio automaticamente.',
    color: '#FF6B35',
  },
  {
    icon: 'radio' as const,
    title: 'Live tracking',
    desc: 'Compartilhe seu treino ao vivo via link público. Amigos e família acompanham em tempo real.',
    color: '#2E7BFF',
  },
  {
    icon: 'flame' as const,
    title: 'Streak gamificado',
    desc: 'Dias consecutivos viram badges: Começando, Aceso, Em chamas, Lendário.',
    color: '#FF1744',
  },
  {
    icon: 'partly-sunny' as const,
    title: 'Melhor horário',
    desc: 'IA combina clima, UV, qualidade do ar e sua agenda. Recomenda hora ideal pra treinar.',
    color: '#FFB13B',
  },
  {
    icon: 'chatbubbles' as const,
    title: 'Chat em tempo real',
    desc: 'Conecta com seus matches via WebSocket. Combine treinos sem sair do app.',
    color: '#4ADE80',
  },
  {
    icon: 'trophy' as const,
    title: '50+ conquistas',
    desc: 'De "Primeiro Passo" a "Ano Imbatível": cada km tem um badge.',
    color: '#8B5CFF',
  },
];

const STATS = [
  { value: '120+', label: 'features' },
  { value: '24h', label: 'GPS ao vivo' },
  { value: 'Free', label: 'pra sempre' },
  { value: 'iOS+Android+Web', label: 'plataformas' },
];

const ACCENT = '#FF6B35';

export default function WelcomeScreen({ navigation }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 900;

  const [slideIdx, setSlideIdx] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;
  const imgOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideY, { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(imgOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setSlideIdx((i) => (i + 1) % SLIDES.length);
        Animated.timing(imgOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[slideIdx];

  // === HERO COMMON (mobile + desktop) ===
  const Hero = (
    <View style={styles.heroSection}>
      <Animated.View style={[styles.heroWrap, { opacity: imgOpacity }]}>
        <ImageBackground source={{ uri: slide.uri }} style={styles.hero} resizeMode="cover">
          <LinearGradient
            colors={['rgba(10,10,15,0.15)', 'rgba(10,10,15,0.55)', 'rgba(10,10,15,0.95)', '#0A0A0F']}
            locations={[0, 0.45, 0.82, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      </Animated.View>

      <View style={styles.centerStage}>
        <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: slideY }] }]}>
          <View style={styles.logoRow}>
            <Logo size={56} variant="filled" />
            <Text style={styles.logo}>SYNC</Text>
          </View>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === slideIdx && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.title}>
            Seu próximo treino{'\n'}
            <Text style={styles.titleAccent}>começa aqui.</Text>
          </Text>

          <Text style={styles.subtitle}>
            {slide.caption}. Conecte-se com atletas, organize eventos e evolua junto.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={16} color={ACCENT} />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.buttons}>
            <Pressable
              onPress={() => navigation.navigate('Register')}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={[ACCENT, '#FF5021']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtnInner}
              >
                <Text style={styles.primaryBtnText}>Começar agora</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>

            <Button
              title="Já tenho conta"
              variant="outline"
              onPress={() => navigation.navigate('Login')}
              style={{ marginTop: spacing.md, borderColor: 'rgba(255,255,255,0.18)' }}
            />

            <Text style={styles.terms}>
              Ao continuar, você aceita nossos{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('Terms')}>Termos</Text> e{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('Privacy')}>Privacidade</Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );

  const handleDemoLogin = async () => {
    try {
      const { authService } = await import('../../services/auth.service');
      const { useAuthStore } = await import('../../store/authStore');
      const data = await authService.login('ana@demo.sync', 'demo1234');
      useAuthStore.setState({
        user: { ...data.user, onboardingCompleted: true },
        token: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (e: any) {
      console.warn('Demo login failed:', e?.message);
    }
  };

  if (!isDesktop) {
    return <View style={styles.root}>{Hero}</View>;
  }

  // === DESKTOP LANDING — Strava-style ===
  return (
    <StravaLandingWeb
      onStart={() => navigation.navigate('Register')}
      onLogin={() => navigation.navigate('Login')}
      onDemo={handleDemoLogin}
    />
  );

  // (legacy landing kept below — unreachable now)
  // eslint-disable-next-line no-unreachable
  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      {Hero}

      {/* Stats bar */}
      <View style={styles.statsSection}>
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Features grid */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionEyebrow}>POR QUE SYNC</Text>
        <Text style={styles.sectionTitle}>
          Tudo que você precisa pra{' '}
          <Text style={{ color: ACCENT }}>treinar de verdade.</Text>
        </Text>
        <Text style={styles.sectionSubtitle}>
          Construído pra atletas que correm, pedalam, nadam ou só amam mover. {' '}
          Tudo num app. Tudo em tempo real.
        </Text>

        <View style={styles.featureGrid}>
          {LANDING_FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.featureCardIcon, { backgroundColor: f.color + '20', borderColor: f.color + '40' }]}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={styles.featureCardTitle}>{f.title}</Text>
              <Text style={styles.featureCardDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA final */}
      <View style={styles.finalCta}>
        <LinearGradient
          colors={['rgba(255,107,53,0.1)', 'rgba(255,107,53,0)']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.finalCtaTitle}>
          Pronto pra começar?
        </Text>
        <Text style={styles.finalCtaSubtitle}>
          Cria sua conta em 30 segundos. É grátis.
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Register')}
          style={({ pressed }) => [styles.finalCtaBtn, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={[ACCENT, '#FF5021']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.finalCtaInner}
          >
            <Text style={styles.finalCtaBtnText}>Criar conta grátis</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 Sync · Feito pra quem move
        </Text>
        <View style={styles.footerLinks}>
          <Text style={styles.footerLink}>Termos</Text>
          <Text style={styles.footerSep}>·</Text>
          <Text style={styles.footerLink}>Privacidade</Text>
          <Text style={styles.footerSep}>·</Text>
          <Text style={styles.footerLink}>Contato</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const { height: screenH } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  heroSection: {
    minHeight: Platform.OS === 'web' ? 820 : screenH,
    position: 'relative',
  },
  heroWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Math.min(screenH * 0.62, 620),
  },
  hero: {
    flex: 1,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    minHeight: Platform.OS === 'web' ? 820 : screenH,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'stretch',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  logoBadge: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  logo: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 22, backgroundColor: ACCENT },
  title: {
    fontSize: 34, fontWeight: '800', color: '#fff', lineHeight: 40,
    textAlign: 'center', letterSpacing: -0.5,
  },
  titleAccent: { color: ACCENT },
  subtitle: {
    fontSize: fontSize.md, color: 'rgba(240,240,255,0.75)',
    marginTop: spacing.md, lineHeight: 22, textAlign: 'center',
  },
  features: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: { fontSize: fontSize.sm, color: '#F0F0FF', fontWeight: '500', flex: 1 },
  buttons: { marginTop: spacing.xl },
  primaryBtn: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 12,
  },
  primaryBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  terms: {
    fontSize: fontSize.xs, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', marginTop: spacing.lg,
  },
  termsLink: { color: ACCENT, fontWeight: '600' },

  // ===== Desktop Landing =====
  statsSection: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,107,53,0.04)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statsRow: {
    maxWidth: 1100, alignSelf: 'center',
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-around', gap: spacing.lg, width: '100%',
  },
  statItem: { alignItems: 'center', minWidth: 140 },
  statValue: {
    fontSize: 40, fontWeight: '900', color: ACCENT, letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11, color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4, fontWeight: '600',
  },
  featuresSection: {
    paddingVertical: 80, paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  sectionEyebrow: {
    fontSize: 11, color: ACCENT, fontWeight: '800',
    letterSpacing: 2, marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 38, fontWeight: '800', color: '#fff',
    textAlign: 'center', letterSpacing: -0.5, lineHeight: 46,
    maxWidth: 740,
  },
  sectionSubtitle: {
    fontSize: fontSize.md, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginTop: spacing.md, maxWidth: 540, lineHeight: 22,
  },
  featureGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.lg, marginTop: spacing.xxl,
    maxWidth: 1100, width: '100%', justifyContent: 'center',
  },
  featureCard: {
    width: 320,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  featureCardIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: spacing.md,
  },
  featureCardTitle: {
    fontSize: fontSize.lg, fontWeight: '700', color: '#fff',
    marginBottom: spacing.sm,
  },
  featureCardDesc: {
    fontSize: fontSize.sm, color: 'rgba(255,255,255,0.6)', lineHeight: 22,
  },
  finalCta: {
    paddingVertical: 100, paddingHorizontal: spacing.lg,
    alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  finalCtaTitle: {
    fontSize: 44, fontWeight: '800', color: '#fff',
    textAlign: 'center', letterSpacing: -1,
  },
  finalCtaSubtitle: {
    fontSize: fontSize.lg, color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.md, textAlign: 'center',
  },
  finalCtaBtn: {
    marginTop: spacing.xl, borderRadius: 16, overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 16,
  },
  finalCtaInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: 18, paddingHorizontal: 36,
  },
  finalCtaBtnText: {
    color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3,
  },
  footer: {
    paddingVertical: spacing.xl, paddingHorizontal: spacing.lg,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', gap: spacing.sm,
  },
  footerText: {
    fontSize: fontSize.xs, color: 'rgba(255,255,255,0.4)',
  },
  footerLinks: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  footerLink: {
    fontSize: fontSize.xs, color: 'rgba(255,255,255,0.6)', fontWeight: '500',
  },
  footerSep: { color: 'rgba(255,255,255,0.3)' },
});
