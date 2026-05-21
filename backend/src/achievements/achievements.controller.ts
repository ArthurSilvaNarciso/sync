import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Achievements')
@Controller('api/achievements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conquistas do usuário' })
  getUserAchievements(@CurrentUser() user: User) {
    return this.achievementsService.getUserAchievements(user.id);
  }

  @Get('check')
  @ApiOperation({ summary: 'Verificar e desbloquear novas conquistas' })
  checkAndUnlock(@CurrentUser() user: User) {
    return this.achievementsService.checkAndUnlock(user.id);
  }

  @Get('xp')
  @ApiOperation({ summary: 'Obter XP e nível do usuário' })
  getUserXP(@CurrentUser() user: User) {
    return this.achievementsService.getUserXP(user.id);
  }
}
