import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Events')
@Controller('api/events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar evento' })
  create(@CurrentUser() user: User, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.id, dto);
  }

  @Post('flash')
  @ApiOperation({ summary: 'Criar evento RELÂMPAGO (começa em ~15min, notifica galera no raio)' })
  createFlash(
    @CurrentUser() user: User,
    @Body()
    dto: {
      sport: string;
      latitude: number;
      longitude: number;
      address?: string;
      maxParticipants?: number;
      startsInMinutes?: number;
      title?: string;
      radiusKm?: number;
    },
  ) {
    return this.eventsService.createFlash(user.id, dto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Buscar eventos próximos' })
  findNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('sport') sport?: string,
  ) {
    const radius = radiusKm ? Math.max(0.5, Math.min(100, parseFloat(radiusKm))) : undefined;
    return this.eventsService.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      radius,
      sport,
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Meus eventos (criados + participando)' })
  getMyEvents(@CurrentUser() user: User) {
    return this.eventsService.getMyEvents(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes de um evento' })
  findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Participar de um evento' })
  join(@CurrentUser() user: User, @Param('id') id: string) {
    return this.eventsService.join(user.id, id);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Sair de um evento' })
  leave(@CurrentUser() user: User, @Param('id') id: string) {
    return this.eventsService.leave(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar/deletar evento (apenas criador)' })
  deleteEvent(@CurrentUser() user: User, @Param('id') id: string) {
    return this.eventsService.deleteEvent(user.id, id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Adicionar comentário a um evento' })
  addComment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.eventsService.addComment(id, user.id, dto.content);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Listar comentários de um evento' })
  getComments(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getComments(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Deletar comentário' })
  deleteComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
  ) {
    return this.eventsService.deleteComment(commentId, user.id);
  }
}
