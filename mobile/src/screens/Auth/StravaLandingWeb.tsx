// Landing page web estilo Strava — desktop only.
// Renderizada quando windowWidth >= 900 dentro do WelcomeScreen.
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../../components/Logo';

const BRAND = '#4A0E2C';
const ACCENT = '#FF6B35';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=2000&q=80';

const FEATURES = [
  {
    icon: 'navigate-circle' as const,
    title: 'Acompanhe seus treinos',
    desc: 'GPS de alta precisão, ritmo, distância, calorias e elevação em tempo real.',
    img: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: 'people' as const,
    title: 'Encontre sua tribo',
    desc: 'Conecte com atletas perto de você. Match por pace, esporte e horário.',
    img: 'https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: 'trophy' as const,
    title: 'Compete & evolua',
    desc: 'Ranking mensal, segments, 50+ conquistas e XP por cada km.',
    img: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: 'flame' as const,
    title: 'Heatmap de rotas',
    desc: 'Descubra as ruas e trilhas mais usadas pelos atletas da sua cidade.',
    img: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: 'flash' as const,
    title: 'Audio coach + Auto-pause',
    desc: 'Voz anuncia cada km, ritmo médio e pausa automática quando você para.',
    img: 'https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=900&q=80',
  },
  {
    icon: 'newspaper' as const,
    title: 'Feed da comunidade',
    desc: 'Compartilhe sua atividade com fotos, rota e stats. Receba kudos.',
    img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: 'Grátis',
    desc: 'Para sempre',
    features: [
      'Tracking GPS ilimitado',
      'Match e chat 1:1',
      'Stories de treino',
      'Grupos públicos',
      'Daily quests + XP',
      'Audio coach básico',
    ],
    highlight: false,
    cta: 'Começar grátis',
  },
  {
    name: 'Premium',
    price: 'R$ 19',
    desc: 'por mês',
    features: [
      'Tudo do Free',
      'Pace zones detalhadas',
      'Estatísticas avançadas',
      'Treinos programados (5K/10K/21K)',
      'Heatmap personalizado',
      'Comparação com pessoas',
      'Sem anúncios',
      'Suporte prioritário',
    ],
    highlight: true,
    cta: 'Em breve',
  },
  {
    name: 'Atleta Pro',
    price: 'R$ 39',
    desc: 'por mês',
    features: [
      'Tudo do Premium',
      'IA Coach personalizado',
      'Análise de overtraining',
      'Segments KOM/QOM',
      'Integração Strava/Garmin',
      'Live streaming de treino',
      'Estatísticas anuais',
    ],
    highlight: false,
    cta: 'Em breve',
  },
];

const TESTIMONIALS = [
  {
    name: 'Ana Silva',
    role: 'Maratonista',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    text: 'Saí dos 5K aos 21K em 3 meses usando os planos de treino. App incrível, comunidade engajada.',
  },
  {
    name: 'Carlos Mendes',
    role: 'Ciclista urbano',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    text: 'O heatmap mudou minha vida — descobri rotas seguras que nem sabia que existiam.',
  },
  {
    name: 'Juliana Costa',
    role: 'Triatleta',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    text: 'Match por pace é genial. Treinei com pessoas no meu ritmo e finalmente curti o esporte de verdade.',
  },
];

interface Props {
  onStart: () => void;
  onLogin: () => void;
  onDemo?: () => void;
}

export default function StravaLandingWeb({ onStart, onLogin, onDemo }: Props) {
  const { width } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const scrollToSection = (key: string) => {
    const y = sectionY.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 70, 0), animated: true });
  };

  const isWide = width >= 1100;
  const cardWidth = isWide ? 380 : Math.min(width - 80, 360);

  return (
    <ScrollView ref={scrollRef} style={styles.root} contentContainerStyle={{ paddingBottom: 0 }}>
      {/* ============ NAV BAR ============ */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={styles.navLogo}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        >
          <Logo size={36} variant="filled" />
          <Text style={styles.navBrand}>SYNC</Text>
        </TouchableOpacity>
        <View style={styles.navLinks}>
          {[
            { label: 'Features', key: 'Features' },
            { label: 'Planos', key: 'Planos' },
            { label: 'Comunidade', key: 'Comunidade' },
          ].map((l) => (
            <TouchableOpacity key={l.key} onPress={() => scrollToSection(l.key)}>
              <Text style={styles.navLink}>{l.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onLogin}>
            <Text style={[styles.navLink, { color: '#fff' }]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navCta} onPress={onStart}>
            <Text style={styles.navCtaText}>Começar grátis</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ============ HERO ============ */}
      <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.hero} resizeMode="cover">
        <LinearGradient
          colors={['rgba(10,5,15,0.4)', 'rgba(10,5,15,0.7)', '#0A050F']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.heroContent, { opacity: fade }]}>
          <Text style={styles.heroEyebrow}>O APP DE ESPORTE PARA QUEM TREINA DE VERDADE</Text>
          <Text style={styles.heroTitle}>
            Mais do que{'\n'}
            <Text style={{ color: ACCENT }}>tracking.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Conecte. Treine. Evolua. Junto com uma comunidade que respira esporte.
          </Text>
          <View style={styles.heroCtas}>
            <TouchableOpacity style={styles.primaryCta} onPress={onStart}>
              <LinearGradient
                colors={[ACCENT, '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryCtaInner}
              >
                <Text style={styles.primaryCtaText}>Começar grátis →</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCta} onPress={onLogin}>
              <Text style={styles.secondaryCtaText}>Já tem conta? Entrar</Text>
            </TouchableOpacity>
            {onDemo && (
              <TouchableOpacity style={styles.secondaryCta} onPress={onDemo}>
                <Text style={[styles.secondaryCtaText, { color: ACCENT }]}>👤 Testar como demo →</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Ionicons name="logo-apple" size={18} color="#fff" />
              <Text style={styles.heroBadgeText}>iOS</Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="logo-android" size={18} color="#fff" />
              <Text style={styles.heroBadgeText}>Android</Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="globe" size={18} color="#fff" />
              <Text style={styles.heroBadgeText}>Web PWA</Text>
            </View>
          </View>
        </Animated.View>
      </ImageBackground>

      {/* ============ STATS BAR ============ */}
      <View style={styles.statsBar}>
        {[
          { v: '100%', l: 'Gratuito' },
          { v: '120+', l: 'Features' },
          { v: '50+', l: 'Conquistas' },
          { v: '∞', l: 'Possibilidades' },
        ].map((s, i) => (
          <View key={i} style={styles.statsItem}>
            <Text style={styles.statsValue}>{s.v}</Text>
            <Text style={styles.statsLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* ============ FEATURES GRID ============ */}
      <View
        style={styles.featuresSection}
        onLayout={(e) => { sectionY.current.Features = e.nativeEvent.layout.y; }}
      >
        <Text style={styles.sectionEyebrow}>POR QUE SYNC</Text>
        <Text style={styles.sectionTitle}>
          Tudo o que você precisa para{'\n'}
          <Text style={{ color: ACCENT }}>treinar de verdade.</Text>
        </Text>

        <View style={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureCard, { width: cardWidth }]}>
              <ImageBackground source={{ uri: f.img }} style={styles.featureImg} resizeMode="cover">
                <LinearGradient
                  colors={['transparent', 'rgba(10,5,15,0.95)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.featureIconWrap}>
                  <Ionicons name={f.icon} size={26} color={ACCENT} />
                </View>
              </ImageBackground>
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ============ APP PREVIEW (mock screenshots) ============ */}
      <View style={styles.appPreview}>
        <Text style={styles.sectionEyebrow}>FEITO PARA O CELULAR</Text>
        <Text style={styles.sectionTitle}>
          Bonito. Rápido. Direto.{'\n'}
          <Text style={{ color: ACCENT }}>Em qualquer device.</Text>
        </Text>
        <Text style={styles.previewSub}>
          Treine pelo Android, iOS ou Web. Seus dados sincronizam em tempo real.
        </Text>
      </View>

      {/* ============ PLANOS (Strava-inspired) ============ */}
      <View
        style={styles.plansSection}
        onLayout={(e) => { sectionY.current.Planos = e.nativeEvent.layout.y; }}
      >
        <Text style={styles.sectionEyebrow}>PLANOS</Text>
        <Text style={styles.sectionTitle}>
          Comece grátis.{'\n'}
          <Text style={{ color: ACCENT }}>Evolua quando quiser.</Text>
        </Text>
        <Text style={styles.previewSub}>
          Todos os recursos essenciais são grátis. Premium para quem quer ir além.
        </Text>

        <View style={styles.plansGrid}>
          {PLANS.map((p, i) => (
            <View
              key={i}
              style={[
                styles.planCard,
                { width: cardWidth },
                p.highlight && styles.planCardHighlight,
              ]}
            >
              {p.highlight && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>MAIS POPULAR</Text>
                </View>
              )}
              <Text style={styles.planName}>{p.name}</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>{p.price}</Text>
                <Text style={styles.planPriceDesc}>{p.desc}</Text>
              </View>
              <View style={styles.planFeatures}>
                {p.features.map((feat, j) => (
                  <View key={j} style={styles.planFeatureRow}>
                    <Ionicons name="checkmark" size={16} color={ACCENT} />
                    <Text style={styles.planFeatureText}>{feat}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.planCta, p.highlight && styles.planCtaHighlight]}
                onPress={onStart}
                disabled={p.cta === 'Em breve'}
              >
                <Text style={[styles.planCtaText, p.highlight && { color: '#fff' }]}>
                  {p.cta}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* ============ TESTIMONIALS ============ */}
      <View
        style={styles.testSection}
        onLayout={(e) => { sectionY.current.Comunidade = e.nativeEvent.layout.y; }}
      >
        <Text style={styles.sectionEyebrow}>COMUNIDADE</Text>
        <Text style={styles.sectionTitle}>
          Atletas de verdade,{'\n'}
          <Text style={{ color: ACCENT }}>resultados de verdade.</Text>
        </Text>

        <View style={styles.testGrid}>
          {TESTIMONIALS.map((t, i) => (
            <View key={i} style={[styles.testCard, { width: cardWidth }]}>
              <View style={styles.testStars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name="star" size={14} color="#FCD34D" />
                ))}
              </View>
              <Text style={styles.testText}>"{t.text}"</Text>
              <View style={styles.testUser}>
                <Image source={{ uri: t.avatar }} style={styles.testAvatar} />
                <View>
                  <Text style={styles.testName}>{t.name}</Text>
                  <Text style={styles.testRole}>{t.role}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ============ FINAL CTA ============ */}
      <LinearGradient
        colors={[BRAND, '#2A0518']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.finalCta}
      >
        <Logo size={72} variant="filled" />
        <Text style={styles.finalCtaTitle}>Pronto pra correr com a Sync?</Text>
        <Text style={styles.finalCtaDesc}>
          Junte-se a milhares de atletas que já treinam de verdade.
        </Text>
        <TouchableOpacity style={[styles.primaryCta, { marginTop: 24 }]} onPress={onStart}>
          <LinearGradient
            colors={[ACCENT, '#FF4500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryCtaInner}
          >
            <Text style={styles.primaryCtaText}>Criar conta gratuita →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* ============ FOOTER ============ */}
      <View style={styles.footer}>
        <View style={styles.footerCols}>
          <View style={styles.footerCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Logo size={32} variant="filled" />
              <Text style={styles.navBrand}>SYNC</Text>
            </View>
            <Text style={styles.footerText}>
              O app social esportivo geolocalizado feito no Brasil 🇧🇷
            </Text>
          </View>
          {[
            { title: 'Produto', items: ['Features', 'Planos', 'Mobile App', 'PWA'] },
            { title: 'Comunidade', items: ['Grupos', 'Eventos', 'Ranking', 'Stories'] },
            { title: 'Empresa', items: ['Sobre', 'Blog', 'Carreiras', 'Imprensa'] },
            { title: 'Legal', items: ['Privacidade', 'Termos', 'Cookies', 'LGPD'] },
          ].map((col, i) => (
            <View key={i} style={styles.footerCol}>
              <Text style={styles.footerTitle}>{col.title}</Text>
              {col.items.map((it, j) => (
                <TouchableOpacity key={j}>
                  <Text style={styles.footerLink}>{it}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.footerBottom}>
          <Text style={styles.footerCopyright}>
            © 2026 Sync. Feito com 🧡 no Brasil.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A050F' },

  // NAV
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  navLogo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBrand: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  navLink: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  navCta: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  navCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // HERO
  hero: { minHeight: 720, justifyContent: 'center', paddingHorizontal: 48, paddingTop: 100 },
  heroContent: { maxWidth: 720 },
  heroEyebrow: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 80,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 84,
    letterSpacing: -2,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
    lineHeight: 32,
    marginTop: 24,
    maxWidth: 540,
  },
  heroCtas: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 40 },
  primaryCta: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  primaryCtaInner: { paddingHorizontal: 32, paddingVertical: 18 },
  primaryCtaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryCta: { paddingHorizontal: 24, paddingVertical: 18 },
  secondaryCtaText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },
  heroBadges: { flexDirection: 'row', gap: 16, marginTop: 32 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroBadgeText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // STATS
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 80,
    paddingVertical: 60,
    paddingHorizontal: 48,
    backgroundColor: '#0A050F',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexWrap: 'wrap',
  },
  statsItem: { alignItems: 'center' },
  statsValue: { color: ACCENT, fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  statsLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  // SECTIONS
  sectionEyebrow: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 54,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 60,
    letterSpacing: -1.5,
    textAlign: 'center',
    marginBottom: 24,
  },
  previewSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    textAlign: 'center',
    maxWidth: 600,
    alignSelf: 'center',
    marginBottom: 40,
  },

  // FEATURES
  featuresSection: { paddingHorizontal: 48, paddingVertical: 100, backgroundColor: '#0A050F' },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
  },
  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureImg: { height: 200, justifyContent: 'flex-end', padding: 16 },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,107,53,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
  },
  featureBody: { padding: 20 },
  featureTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  featureDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 22 },

  // PREVIEW
  appPreview: {
    paddingVertical: 80,
    paddingHorizontal: 48,
    backgroundColor: '#0A050F',
    alignItems: 'center',
  },

  // PLANS
  plansSection: { paddingHorizontal: 48, paddingVertical: 100, backgroundColor: '#0A050F' },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  planCardHighlight: {
    backgroundColor: 'rgba(255,107,53,0.05)',
    borderColor: 'rgba(255,107,53,0.4)',
    transform: [{ scale: 1.05 }],
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  planBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  planName: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 24 },
  planPrice: { color: '#fff', fontSize: 48, fontWeight: '900' },
  planPriceDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  planFeatures: { gap: 12, marginBottom: 32 },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planFeatureText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, flex: 1 },
  planCta: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  planCtaHighlight: { backgroundColor: ACCENT, borderColor: ACCENT },
  planCtaText: { color: '#fff', fontWeight: '700' },

  // TESTIMONIALS
  testSection: { paddingHorizontal: 48, paddingVertical: 100, backgroundColor: '#0A050F' },
  testGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 },
  testCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  testStars: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  testText: { color: '#fff', fontSize: 15, lineHeight: 24, marginBottom: 24, fontStyle: 'italic' },
  testUser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testAvatar: { width: 48, height: 48, borderRadius: 24 },
  testName: { color: '#fff', fontWeight: '800', fontSize: 15 },
  testRole: { color: ACCENT, fontSize: 12, fontWeight: '600' },

  // FINAL CTA
  finalCta: { paddingVertical: 100, paddingHorizontal: 48, alignItems: 'center' },
  finalCtaTitle: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    marginTop: 24,
    textAlign: 'center',
    letterSpacing: -1,
  },
  finalCtaDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },

  // FOOTER
  footer: { backgroundColor: '#050308', paddingHorizontal: 48, paddingVertical: 60 },
  footerCols: { flexDirection: 'row', flexWrap: 'wrap', gap: 60, justifyContent: 'space-between' },
  footerCol: { minWidth: 180, maxWidth: 280 },
  footerTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 20 },
  footerLink: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 10,
  },
  footerBottom: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerCopyright: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' },
});
