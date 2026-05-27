import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ChallengesService } from './challenges.service';

@ApiTags('Challenges')
@Controller('api/challenges')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChallengesController {
  constructor(private readonly svc: ChallengesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um desafio para outro usuário' })
  create(
    @CurrentUser() user: User,
    @Body() body: {
      challengedId: string;
      sport: string;
      metric: string;
      target: number;
      expiresInDays?: number;
    },
  ) {
    return this.svc.create(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar meus desafios (enviados + recebidos)' })
  list(@CurrentUser() user: User) {
    return this.svc.list(user.id);
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Aceitar ou recusar um desafio' })
  respond(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { accept: boolean },
  ) {
    return this.svc.respond(user.id, id, body.accept);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Marcar desafio como concluído (declarar vencedor)' })
  complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.svc.complete(user.id, id);
  }
}
