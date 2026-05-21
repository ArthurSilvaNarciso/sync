import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RankingService } from './ranking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Ranking')
@Controller('api/ranking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Ranking mensal por distância' })
  getMonthlyRanking(
    @Query('city') city?: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.rankingService.getMonthlyRanking(city, month, year);
  }
}
