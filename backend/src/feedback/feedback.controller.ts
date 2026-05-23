import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Feedback, FeedbackType } from './feedback.entity';
import { Request } from 'express';
import { sanitizeText } from '../common/security/sanitize.util';

@ApiTags('Feedback')
@Controller('api/feedback')
export class FeedbackController {
  constructor(
    @InjectRepository(Feedback) private readonly repo: Repository<Feedback>,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Enviar feedback (bug/sugestão/rating/suporte)' })
  async submit(
    @CurrentUser() user: User,
    @Body() body: { type: FeedbackType; message: string; rating?: number },
    @Req() req: Request,
  ) {
    const validTypes: FeedbackType[] = ['bug', 'suggestion', 'rating', 'support'];
    if (!validTypes.includes(body.type)) {
      return { error: 'Tipo inválido', validTypes };
    }
    const cleanMessage = sanitizeText(body.message, 2000);
    if (!cleanMessage || cleanMessage.length < 3) {
      return { error: 'Mensagem muito curta' };
    }
    const fb = this.repo.create({
      user_id: user.id,
      type: body.type,
      message: cleanMessage,
      rating: body.rating != null ? Math.max(1, Math.min(5, body.rating)) : null,
      userAgent: req.headers['user-agent']?.toString().slice(0, 200) || null,
      status: 'new',
    });
    await this.repo.save(fb);
    return { ok: true, message: 'Feedback recebido! Obrigado. 🙏' };
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Meus feedbacks enviados' })
  async mine(@CurrentUser() user: User) {
    return this.repo.find({
      where: { user_id: user.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
