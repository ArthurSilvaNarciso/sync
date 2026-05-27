// Subscription tier endpoints. Stripe-ready (placeholder, sem cobrança real ainda).
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['Tracking GPS ilimitado', 'Match e chat', 'Stories', 'Grupos públicos', 'Daily quests', 'Audio coach básico'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 19,
    features: ['Tudo do Free', 'Pace zones detalhadas', 'Stats avançadas', 'Planos de treino', 'Heatmap personalizado', 'Sem anúncios'],
  },
  atleta_pro: {
    id: 'atleta_pro',
    name: 'Atleta Pro',
    price: 39,
    features: ['Tudo do Premium', 'IA Coach', 'Análise overtraining', 'Segments KOM/QOM', 'Integração Strava/Garmin', 'Live streaming'],
  },
};

@ApiTags('Subscriptions')
@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Listar planos disponíveis' })
  plans() {
    return Object.values(PLANS);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Meu plano atual' })
  async me(@CurrentUser() user: User) {
    const full = await this.userRepo.findOne({ where: { id: user.id } });
    const tier = (full?.subscriptionTier || 'free') as keyof typeof PLANS;
    return {
      currentTier: tier,
      plan: PLANS[tier] || PLANS.free,
      expiresAt: full?.subscriptionExpiresAt,
      isActive: !full?.subscriptionExpiresAt || full.subscriptionExpiresAt > new Date(),
    };
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade pra Premium ou Pro (mock — Stripe TODO)' })
  async upgrade(@CurrentUser() user: User, @Body() body: { tier: 'premium' | 'atleta_pro' }) {
    // SECURITY: em produção com Stripe configurado, upgrades devem vir APENAS
    // via webhook assinado do Stripe — nunca via chamada direta do cliente.
    if (process.env.STRIPE_SECRET_KEY) {
      return {
        error: 'use_stripe_checkout',
        message: 'Stripe configurado. Use POST /subscriptions/stripe/checkout para iniciar pagamento.',
      };
    }
    const validTiers = ['premium', 'atleta_pro'];
    if (!validTiers.includes(body.tier)) {
      return { error: 'Tier inválido', validTiers };
    }
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
    await this.userRepo.update(user.id, {
      subscriptionTier: body.tier,
      subscriptionExpiresAt: expiresAt,
    });
    return {
      ok: true,
      message: `Upgrade pra ${body.tier} feito! Válido por 30 dias.`,
      tier: body.tier,
      expiresAt,
      _note: 'MOCK: Stripe integration TODO. Em prod, isto exigiria webhook do Stripe.',
    };
  }

  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Webhook Stripe (stub — precisa STRIPE_SECRET_KEY)' })
  async stripeWebhook(@Body() body: any) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        error: 'stripe_not_configured',
        message: 'Stripe não configurado. Setar STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET no Railway.',
        howTo: 'https://dashboard.stripe.com/test/apikeys',
      };
    }
    // TODO: verify signature + handle checkout.session.completed
    return { received: true };
  }

  @Post('stripe/checkout')
  @ApiOperation({ summary: 'Criar Stripe Checkout Session (stub)' })
  async stripeCheckout(@Body() body: { tier: 'premium' | 'atleta_pro' }) {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        error: 'stripe_not_configured',
        message: 'Stripe não configurado. Use /upgrade (mock) por enquanto.',
      };
    }
    // TODO: criar checkout session real
    return { error: 'not_implemented' };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar assinatura' })
  async cancel(@CurrentUser() user: User) {
    await this.userRepo.update(user.id, {
      subscriptionTier: 'free',
      subscriptionExpiresAt: null,
    });
    return { ok: true, message: 'Assinatura cancelada. Você voltou pro plano Free.' };
  }
}
