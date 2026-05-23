import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
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

  // === RATING (pós-treino) ===
  @Post(':id/rating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Avaliar atividade (energia/satisfação/RPE/dor/tipo)' })
  rate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { energy?: number; satisfaction?: number; rpe?: number; pain?: number; workoutType?: string; weatherFelt?: string; notes?: string },
  ) {
    return this.activitiesService.upsertRating(id, user.id, body);
  }

  @Get(':id/rating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter rating da atividade' })
  getRating(@CurrentUser() user: User, @Param('id') id: string) {
    return this.activitiesService.getRating(id, user.id);
  }

  // === LIVE CHEER ===
  @Post('live/:token/cheer')
  @ApiOperation({ summary: '"Vai!" — incrementa contador de cheers da live activity' })
  async cheer(@Param('token') token: string) {
    const activity = await this.activitiesService.getLiveByToken(token);
    return this.activitiesService.addCheer(activity.activityId);
  }

  // === COMPARE 2 activities ===
  @Get('compare/:a1/:a2')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comparar 2 atividades lado-a-lado' })
  compare(@CurrentUser() user: User, @Param('a1') a1: string, @Param('a2') a2: string) {
    return this.activitiesService.compare(a1, a2, user.id);
  }

  // === ADD PHOTO to activity ===
  @Post(':id/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adicionar URL de foto à atividade (max 5)' })
  addPhoto(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { photoUrl: string },
  ) {
    return this.activitiesService.addPhoto(id, user.id, body.photoUrl);
  }

  // === HEATMAP ===
  @Get('heatmap/nearby')
  @ApiOperation({ summary: 'Heatmap de pontos GPS próximos (rotas populares)' })
  async heatmap(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = parseFloat(radiusKm || '5');
    if (!isFinite(latitude) || !isFinite(longitude)) {
      return { points: [] };
    }
    const points = await this.activitiesService.getHeatmapPoints(latitude, longitude, radius);
    return { points };
  }

  // === EXPORT GPX ===
  @Get(':id/export.gpx')
  @ApiOperation({ summary: 'Exportar atividade como GPX (compatível Strava, Garmin Connect)' })
  async exportGpx(@Param('id') id: string, @Res() res: Response) {
    const detail = await this.activitiesService.getActivityDetail(id);
    if (!detail) return res.status(404).send('Activity not found');
    const gpx = this.buildGpx(detail);
    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `attachment; filename="sync-${id}.gpx"`);
    return res.send(gpx);
  }

  private buildGpx(activity: any): string {
    const points = (activity.points || []).map((p: any) => {
      const time = new Date(p.timestamp || p.createdAt || Date.now()).toISOString();
      const ele = p.altitude != null ? `<ele>${p.altitude}</ele>` : '';
      return `      <trkpt lat="${p.latitude}" lon="${p.longitude}">${ele}<time>${time}</time></trkpt>`;
    }).join('\n');
    const name = activity.sport ? `Sync ${activity.sport}` : 'Sync activity';
    const startedAt = new Date(activity.startedAt || activity.createdAt || Date.now()).toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sync" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><time>${startedAt}</time></metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
  }
}
