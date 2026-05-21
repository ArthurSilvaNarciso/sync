import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Notifications')
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushService,
  ) {}

  // === PUSH TOKENS ===
  @Post('push-token')
  @ApiOperation({ summary: 'Registrar token de push notification do device' })
  registerPushToken(
    @CurrentUser() user: User,
    @Body() body: { token: string; platform?: string; deviceName?: string },
  ) {
    return this.pushService.registerToken(user.id, body.token, body.platform, body.deviceName);
  }

  @Delete('push-token')
  @ApiOperation({ summary: 'Remover token (logout)' })
  removePushToken(@CurrentUser() user: User, @Body() body: { token: string }) {
    return this.pushService.removeToken(user.id, body.token);
  }

  @Post('test-push')
  @ApiOperation({ summary: 'Enviar push de teste para si mesmo' })
  testPush(@CurrentUser() user: User) {
    return this.pushService.sendToUser(
      user.id,
      'Sync funciona! ⚡',
      'Você recebeu este push porque pediu um teste.',
      { type: 'test' },
    );
  }

  // === IN-APP NOTIFICATIONS ===
  @Get()
  @ApiOperation({ summary: 'Listar notificacoes com paginacao' })
  getNotifications(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Quantidade de notificacoes nao lidas' })
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Marcar todas as notificacoes como lidas' })
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Marcar notificacao como lida' })
  markAsRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
