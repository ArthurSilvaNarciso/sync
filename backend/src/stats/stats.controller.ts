import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Stats')
@Controller('api/stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Estatísticas completas do usuário' })
  getUserStats(@CurrentUser() user: User) {
    return this.statsService.getUserStats(user.id);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Resumo semanal do usuário' })
  getWeeklySummary(@CurrentUser() user: User) {
    return this.statsService.getWeeklySummary(user.id);
  }
}
