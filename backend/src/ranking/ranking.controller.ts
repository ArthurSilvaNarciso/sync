import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RankingService } from './ranking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Ranking')
@Controller('api/ranking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Ranking mensal por distância (filtrável por cidade/esporte)' })
  getMonthlyRanking(
    @Query('city') city?: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
    @Query('sport') sport?: string,
  ) {
    return this.rankingService.getMonthlyRanking(city, month, year, sport);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Ranking da semana corrente' })
  getWeeklyRanking(
    @Query('city') city?: string,
    @Query('sport') sport?: string,
  ) {
    return this.rankingService.getWeeklyRanking(city, sport);
  }

  @Get('friends')
  @ApiOperation({ summary: 'Ranking entre seus amigos (matches)' })
  getFriendsRanking(
    @CurrentUser() user: User,
    @Query('scope') scope?: 'week' | 'month',
  ) {
    return this.rankingService.getFriendsRanking(user.id, scope || 'month');
  }
}
