import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Chat')
@Controller('api/chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Listar conversas do usuário' })
  getConversations(@CurrentUser() user: User) {
    return this.chatService.getConversations(user.id);
  }

  @Get(':matchId/messages')
  @ApiOperation({ summary: 'Buscar mensagens de uma conversa' })
  getMessages(
    @CurrentUser() user: User,
    @Param('matchId') matchId: string,
    @Query('page') page?: number,
  ) {
    return this.chatService.getMessages(user.id, matchId, page);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Enviar mensagem (REST fallback)' })
  sendMessage(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(user.id, dto);
  }

  @Put(':matchId/read')
  @ApiOperation({ summary: 'Marcar mensagens como lidas' })
  markAsRead(@CurrentUser() user: User, @Param('matchId') matchId: string) {
    return this.chatService.markAsRead(user.id, matchId);
  }
}
