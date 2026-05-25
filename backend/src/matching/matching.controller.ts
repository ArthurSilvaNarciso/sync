import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { SwipeDto } from './dto/swipe.dto';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Matching')
@Controller('api/matching')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('discover')
  @ApiOperation({ summary: 'Descobrir usuários próximos e compatíveis' })
  discover(@CurrentUser() user: User, @Query() query: DiscoveryQueryDto) {
    return this.matchingService.discover(user.id, query);
  }

  @Post('swipe')
  @ApiOperation({ summary: 'Swipe (like/ignore) em um usuário' })
  swipe(@CurrentUser() user: User, @Body() dto: SwipeDto) {
    return this.matchingService.swipe(user.id, dto);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Listar todos os matches' })
  getMatches(@CurrentUser() user: User) {
    return this.matchingService.getMatches(user.id);
  }

  @Get('new-count')
  @ApiOperation({ summary: 'Contar novos matches das últimas 24h' })
  getNewMatchCount(@CurrentUser() user: User) {
    return this.matchingService.getNewMatchCount(user.id).then((count) => ({ count }));
  }

  @Get('likes-received')
  @ApiOperation({ summary: 'Listar usuários que te curtiram mas você ainda não respondeu' })
  getLikesReceived(@CurrentUser() user: User) {
    return this.matchingService.getLikesReceived(user.id);
  }

  @Get('likes-received/count')
  @ApiOperation({ summary: 'Contagem de likes pendentes (badge)' })
  getLikesReceivedCount(@CurrentUser() user: User) {
    return this.matchingService.getLikesReceivedCount(user.id).then((count) => ({ count }));
  }
}
