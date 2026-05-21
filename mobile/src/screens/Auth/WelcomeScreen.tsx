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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

// Imagens reais — corrida & natureza com tons que casam com a paleta dark + orange
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

const ACCENT = '#FF6B35';

export default function WelcomeScreen({ navigation }: Props) {
  const [slideIdx, setSlideIdx] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;
  const imgOpacity = useRef(new Animated.Value(1)).current;

  // Entrada animada
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(slideY, { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);

  // Auto-rotate slides com crossfade
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

  return (
    <View style={styles.root}>
      {/* Hero image com crossfade */}
      <Animated.View style={[styles.heroWrap, { opacity: imgOpacity }]}>
        <ImageBackground source={{ uri: slide.uri }} style={styles.hero} resizeMode="cover">
          {/* Overlay escuro para legibilidade */}
          <LinearGradient
            colors={['rgba(10,10,15,0.15)', 'rgba(10,10,15,0.55)', 'rgba(10,10,15,0.95)', '#0A0A0F']}
            locations={[0, 0.45, 0.82, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      </Animated.View>

      <View style={styles.centerStage}>
        <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: slideY }] }]}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <LinearGradient
              colors={[ACCENT, '#FF8A5C', '#FFB07A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadge}
            >
              <Ionicons name="flash" size={26} color={colors.white} />
            </LinearGradient>
            <Text style={styles.logo}>SYNC</Text>
          </View>

          {/* Caption indicator */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === slideIdx && styles.dotActive]}
              />
            ))}
          </View>

          <Text style={styles.title}>
            Seu próximo treino{'\n'}
            <Text style={styles.titleAccent}>começa aqui.</Text>
          </Text>

          <Text style={styles.subtitle}>
            {slide.caption}. Conecte-se com atletas, organize eventos e evolua junto.
          </Text>

          {/* Features em glass cards */}
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

          {/* CTAs */}
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
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
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
              <Text style={styles.termsLink}>Termos</Text> e{' '}
              <Text style={styles.termsLink}>Privacidade</Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const { height: screenH } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0F',
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
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 4,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 22,
    backgroundColor: ACCENT,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 40,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: ACCENT,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(240,240,255,0.75)',
    marginTop: spacing.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  features: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  buttons: {
    marginTop: spacing.xl,
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
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  terms: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  termsLink: {
    color: ACCENT,
    fontWeight: '600',
  },
});
