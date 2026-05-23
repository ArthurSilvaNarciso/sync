// IA Coach básico — analisa últimos treinos e sugere próximo passo.
// Regras heurísticas (sem ML, mas inteligente o suficiente).
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Activity } from '../activities/entities/activity.entity';

interface CoachInsight {
  emoji: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  action?: string;
}

@ApiTags('IA Coach')
@Controller('api/coach')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoachController {
  constructor(
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
  ) {}

  @Get('insights')
  @ApiOperation({ summary: 'Insights e recomendações da IA baseado no histórico' })
  async insights(@CurrentUser() user: User) {
    // Últimos 30 dias
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activities = await this.activityRepo
      .createQueryBuilder('a')
      .where('a.user_id = :uid', { uid: user.id })
      .andWhere('a.isCompleted = true')
      .andWhere('a.startTime >= :since', { since })
      .orderBy('a.startTime', 'DESC')
      .getMany();

    const insights: CoachInsight[] = [];

    if (activities.length === 0) {
      insights.push({
        emoji: '🚀',
        title: 'Bora começar?',
        message: 'Você ainda não tem atividades neste mês. Comece com um treino leve hoje!',
        type: 'tip',
        action: 'start_workout',
      });
      return { insights, summary: { totalKm: 0, totalActivities: 0, daysActive: 0 } };
    }

    const totalKm = activities.reduce((s, a) => s + (a.distance || 0) / 1000, 0);
    const totalActivities = activities.length;
    const totalDuration = activities.reduce((s, a) => s + (a.duration || 0), 0);
    const avgPace = activities.length > 0
      ? activities.reduce((s, a) => s + (a.avgPace || 0), 0) / activities.length
      : 0;
    const uniqueDays = new Set(activities.map((a) => new Date(a.startTime).toDateString())).size;

    // === HEURÍSTICAS ===

    // 1. Detecção de overtraining
    const lastWeek = activities.filter(
      (a) => new Date(a.startTime).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
    );
    if (lastWeek.length >= 6) {
      insights.push({
        emoji: '⚠️',
        title: 'Atenção: overtraining',
        message: `Você treinou ${lastWeek.length} vezes essa semana. Considere um dia de descanso ativo. Recuperação é parte do treino!`,
        type: 'warning',
      });
    }

    // 2. Consistência
    if (uniqueDays >= 20) {
      insights.push({
        emoji: '🔥',
        title: 'Consistência de campeão',
        message: `${uniqueDays} dias ativos em 30. Sua disciplina está ótima — continue assim!`,
        type: 'success',
      });
    } else if (uniqueDays >= 12) {
      insights.push({
        emoji: '✅',
        title: 'No ritmo certo',
        message: `${uniqueDays} dias ativos. Tente alcançar 4-5 treinos/semana pra resultados ainda melhores.`,
        type: 'info',
      });
    } else if (uniqueDays < 4) {
      insights.push({
        emoji: '💪',
        title: 'Hora de retomar',
        message: `Só ${uniqueDays} dias ativos este mês. Que tal um treino leve hoje pra recomeçar?`,
        type: 'tip',
        action: 'start_workout',
      });
    }

    // 3. Análise de pace
    if (avgPace > 0) {
      const recentFive = activities.slice(0, 5);
      const olderFive = activities.slice(5, 10);
      if (recentFive.length === 5 && olderFive.length === 5) {
        const recentAvg = recentFive.reduce((s, a) => s + (a.avgPace || 0), 0) / 5;
        const olderAvg = olderFive.reduce((s, a) => s + (a.avgPace || 0), 0) / 5;
        if (recentAvg < olderAvg - 0.2) {
          insights.push({
            emoji: '📈',
            title: 'Evolução notável!',
            message: `Seu pace médio melhorou ${Math.round((olderAvg - recentAvg) * 60)}s/km nas últimas 5 atividades. Você está mais rápido!`,
            type: 'success',
          });
        } else if (recentAvg > olderAvg + 0.3) {
          insights.push({
            emoji: '🤔',
            title: 'Ritmo caindo',
            message: 'Suas últimas atividades foram mais lentas. Pode ser cansaço — tente um recovery run amanhã.',
            type: 'warning',
          });
        }
      }
    }

    // 4. Sugestão de próximo treino baseado no último
    const lastActivity = activities[0];
    const lastDistanceKm = (lastActivity.distance || 0) / 1000;
    const hoursAgo = (Date.now() - new Date(lastActivity.startTime).getTime()) / 3600000;

    if (hoursAgo > 48) {
      insights.push({
        emoji: '⏰',
        title: 'Vai treinar hoje?',
        message: `Último treino foi há ${Math.round(hoursAgo / 24)} dias. Que tal voltar com um easy run de 5km?`,
        type: 'tip',
        action: 'start_workout',
      });
    } else if (hoursAgo < 18 && lastDistanceKm > 10) {
      insights.push({
        emoji: '🛌',
        title: 'Hora de descansar',
        message: `Você correu ${lastDistanceKm.toFixed(1)}km recentemente. Hoje só alongamento + hidratação.`,
        type: 'info',
      });
    } else if (hoursAgo > 12 && lastDistanceKm < 5) {
      insights.push({
        emoji: '🎯',
        title: 'Sugestão pro próximo',
        message: 'Você tem corrido distâncias curtas. Que tal um long run no fim de semana? Tente 7-10km.',
        type: 'tip',
      });
    }

    // 5. Hidratação
    if (lastWeek.length > 3) {
      insights.push({
        emoji: '💧',
        title: 'Hidratação',
        message: 'Treinando bastante essa semana — lembre de tomar 2.5L de água/dia + eletrólitos pós-treino longo.',
        type: 'info',
      });
    }

    return {
      insights,
      summary: {
        totalKm: Math.round(totalKm * 10) / 10,
        totalActivities,
        daysActive: uniqueDays,
        totalHours: Math.round((totalDuration / 3600) * 10) / 10,
        avgPace: avgPace > 0 ? `${Math.floor(avgPace)}:${Math.round((avgPace - Math.floor(avgPace)) * 60).toString().padStart(2, '0')}` : '--:--',
      },
    };
  }
}
