import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { AddPointDto } from './dto/add-point.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Activities')
@Controller('api/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  // ====== ROTAS PÚBLICAS (sem auth) ======
  @Get('live/:token')
  @ApiOperation({ summary: 'Ver atividade ao vivo via token público' })
  getLive(@Param('token') token: string) {
    return this.activitiesService.getLiveByToken(token);
  }

  // ====== ROTAS AUTENTICADAS ======

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar nova atividade' })
  start(@CurrentUser() user: User, @Body() dto: CreateActivityDto) {
    return this.activitiesService.start(user.id, dto);
  }

  @Post(':id/points')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adicionar ponto GPS à atividade' })
  addPoint(@Param('id') id: string, @Body() dto: AddPointDto) {
    return this.activitiesService.addPoint(id, dto);
  }

  @Put(':id/finish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finalizar atividade e calcular métricas' })
  finish(@CurrentUser() user: User, @Param('id') id: string) {
    return this.activitiesService.finish(id, user.id);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gerar token público de live tracking' })
  share(@CurrentUser() user: User, @Param('id') id: string) {
    return this.activitiesService.createShareToken(user.id, id);
  }

  @Delete(':id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revogar live tracking público' })
  revokeShare(@CurrentUser() user: User, @Param('id') id: string) {
    return this.activitiesService.revokeShare(user.id, id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico de atividades' })
  getHistory(@CurrentUser() user: User, @Query('page') page?: string) {
    return this.activitiesService.getUserActivities(user.id, page ? parseInt(page, 10) : 1);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes da atividade com rota' })
  getDetail(@Param('id') id: string) {
    return this.activitiesService.getActivityDetail(id);
  }

  // === COMMENTS ===
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comentar em atividade' })
  comment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.activitiesService.addComment(id, user.id, body.content);
  }

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar comentários' })
  comments(@Param('id') id: string) {
    return this.activitiesService.listComments(id);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar próprio comentário' })
  deleteComment(@CurrentUser() user: User, @Param('commentId') commentId: string) {
    return this.activitiesService.deleteComment(commentId, user.id);
  }

  // === KUDOS ===
  @Post(':id/kudos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle kudos (like) na atividade' })
  kudos(@CurrentUser() user: User, @Param('id') id: string) {
    return this.activitiesService.toggleKudos(id, user.id);
  }

  @Get(':id/kudos')
  @ApiOperation({ summary: 'Total de kudos' })
  kudosCount(@Param('id') id: string) {
    return this.activitiesService.getKudosCount(id).then((total) => ({ total }));
  }
}
