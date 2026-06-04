import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TerritoryService } from './territory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Territory')
@Controller('api/territory')
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Conquistar células de território pela rota percorrida' })
  claim(
    @CurrentUser() user: User,
    @Body('points') points: { lat: number; lng: number }[],
  ) {
    return this.territoryService.claim(user.id, points || []);
  }

  @Get('cells')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Células de território dentro da viewport (bbox)' })
  cells(
    @Query('minLat') minLat: string,
    @Query('minLng') minLng: string,
    @Query('maxLat') maxLat: string,
    @Query('maxLng') maxLng: string,
  ) {
    return this.territoryService.cellsInBox(
      parseFloat(minLat),
      parseFloat(minLng),
      parseFloat(maxLat),
      parseFloat(maxLng),
    );
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ranking de territórios (top conquistadores)' })
  leaderboard() {
    return this.territoryService.leaderboard(10);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Minhas estatísticas de território' })
  me(@CurrentUser() user: User) {
    return this.territoryService.myStats(user.id);
  }
}
