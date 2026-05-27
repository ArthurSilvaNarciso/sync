// Tela Premium — planos Free / Premium / Atleta Pro com glassmorphism
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import api from '../../services/api';
import { showToast } from '../../components/ui/Toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface Subscription {
  currentTier: string;
  plan: Plan;
  expiresAt: string | null;
  isActive: boolean;
}

const TIER_COLORS: Record<string, [string, string]> = {
  free: ['#374151', '#1F2937'],
  premium: ['#FF6B35', '#FF4500'],
  atleta_pro: ['#7C3AED', '#4C1D95'],
};

const TIER_ICONS: Record<string, string> = {
  free: 'person',
  premium: 'star',
  atleta_pro: 'trophy',
};

const TIER_BADGE_COLORS: Record<string, string> = {
  free: '#6B7280',
  premium: '#FF6B35',
  atleta_pro: '#7C3AED',
};

export default function PremiumScreen({ navigation }: any) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, meRes] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/me'),
      ]);
      setPlans(plansRes.data || []);
      setSubscription(meRes.data);
    } catch {
      showToast('Erro ao carregar planos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tierId: string) => {
    if (tierId === 'free') {
      Alert.alert(
        'Cancelar assinatura?',
        'Você voltará para o plano gratuito. Suas funcionalidades premium serão removidas.',
        [
          { text: 'Não', style: 'cancel' },
          {
            text: 'Cancelar assinatura',
            style: 'destructive',
            onPress: async () => {
              setUpgrading('free');
              try {
                await api.post('/subscriptions/cancel');
                showToast('Assinatura cancelada', 'success');
                await loadData();
              } catch {
                showToast('Erro ao cancelar', 'error');
              } finally {
                setUpgrading(null);
              }
            },
          },
        ],
      );
      return;
    }

    setUpgrading(tierId);
    try {
      const { data } = await api.post('/subscriptions/upgrade', { tier: tierId });
      showToast(data.message || 'Upgrade realizado!', 'success');
      await loadData();
    } catch {
      showToast('Erro no upgrade. Tente novamente.', 'error');
    } finally {
      setUpgrading(null);
    }
  };

  const currentTier = subscription?.currentTier || 'free';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {/* Hero — current plan */}
      <LinearGradient
        colors={TIER_COLORS[currentTier] || ['#374151', '#1F2937']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons
              name={TIER_ICONS[currentTier] as any || 'person'}
              size={16}
              color="#fff"
            />
            <Text style={styles.heroBadgeText}>Plano atual</Text>
          </View>
        </View>
        <Text style={styles.heroTier}>{subscription?.plan?.name || 'Free'}</Text>
        <Text style={styles.heroPrice}>
          {subscription?.plan?.price === 0
            ? 'Gratuito'
            : `R$ ${subscription?.plan?.price}/mês`}
        </Text>
        {subscription?.expiresAt && (
          <Text style={styles.heroExpiry}>
            Válido até {new Date(subscription.expiresAt).toLocaleDateString('pt-BR')}
          </Text>
        )}
      </LinearGradient>

      {/* Tagline */}
      <View style={styles.taglineWrap}>
        <Text style={styles.tagline}>Escolha o plano ideal para sua jornada</Text>
        <Text style={styles.taglineSub}>
          Cancele quando quiser · Sem fidelidade
        </Text>
      </View>

      {/* Plan cards */}
      {plans.map((plan) => {
        const isCurrent = plan.id === currentTier;
        const isUpgrade =
          (currentTier === 'free' && (plan.id === 'premium' || plan.id === 'atleta_pro')) ||
          (currentTier === 'premium' && plan.id === 'atleta_pro');
        const isLoading = upgrading === plan.id;
        const gradColors = TIER_COLORS[plan.id] || ['#374151', '#1F2937'];
        const badgeColor = TIER_BADGE_COLORS[plan.id] || '#6B7280';

        return (
          <View key={plan.id} style={[styles.planCard, isCurrent && styles.planCardActive]}>
            {isCurrent && (
              <View style={[styles.currentBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.currentBadgeText}>ATUAL</Text>
              </View>
            )}

            {/* Plan header */}
            <View style={styles.planHeader}>
              <LinearGradient
                colors={gradColors}
                style={styles.planIconWrap}
              >
                <Ionicons
                  name={TIER_ICONS[plan.id] as any || 'person'}
                  size={20}
                  color="#fff"
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>
                  {plan.price === 0 ? 'Grátis para sempre' : `R$ ${plan.price}/mês`}
                </Text>
              </View>
            </View>

            {/* Features list */}
            <View style={styles.featuresList}>
              {plan.features.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureCheck, { backgroundColor: badgeColor + '25' }]}>
                    <Ionicons name="checkmark" size={12} color={badgeColor} />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* CTA button */}
            {!isCurrent && (
              <TouchableOpacity
                style={[styles.ctaButton, isLoading && { opacity: 0.6 }]}
                onPress={() => handleUpgrade(plan.id)}
                disabled={!!upgrading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <LinearGradient
                    colors={gradColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                  >
                    <Text style={styles.ctaText}>
                      {isUpgrade ? `Fazer upgrade → ${plan.name}` : `Mudar para ${plan.name}`}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            )}

            {isCurrent && plan.price > 0 && (
              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => handleUpgrade('free')}
              >
                <Text style={styles.cancelLinkText}>Cancelar assinatura</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Footer note */}
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255,255,255,0.4)" />
        <Text style={styles.footerText}>
          Pagamentos seguros via Stripe · Cancele a qualquer momento
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },

  // ── Hero card ──────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  heroTop: { marginBottom: spacing.sm },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroTier: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroPrice: { fontSize: fontSize.md, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroExpiry: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 6 },

  // ── Tagline ────────────────────────────────────────────────────────────────
  taglineWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  tagline: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  taglineSub: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
    textAlign: 'center',
  },

  // ── Plan card ──────────────────────────────────────────────────────────────
  planCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  planCardActive: {
    borderColor: 'rgba(255,107,53,0.45)',
    backgroundColor: 'rgba(255,107,53,0.06)',
  },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },

  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
  planPrice: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  featuresList: { gap: 8, marginBottom: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', flex: 1 },

  ctaButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  ctaText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  cancelLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  cancelLinkText: {
    fontSize: 12,
    color: 'rgba(248,113,113,0.7)',
    fontWeight: '600',
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    flex: 1,
  },
});
