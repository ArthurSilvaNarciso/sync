import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

// Gateway WebSocket para chat em tempo real
// Socket.io gerencia conexões, rooms e broadcast de mensagens
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Mapa de userId → socketId para rastrear usuários online
  private onlineUsers = new Map<string, string>();

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.onlineUsers.set(userId, client.id);
      this.server.emit('userOnline', { userId });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = [...this.onlineUsers.entries()].find(
      ([_, socketId]) => socketId === client.id,
    )?.[0];

    if (userId) {
      this.onlineUsers.delete(userId);
      this.server.emit('userOffline', { userId });
    }
  }

  // Entrar na room do match para receber mensagens em tempo real
  @SubscribeMessage('joinChat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    client.join(`match:${data.matchId}`);
  }

  // Enviar mensagem via WebSocket
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { matchId: string; senderId: string; content: string },
  ) {
    try {
      if (!data.matchId || !data.senderId || !data.content?.trim()) {
        client.emit('error', { message: 'Dados da mensagem inválidos' });
        return;
      }
      if (data.content.trim().length > 1000) {
        client.emit('error', { message: 'Mensagem muito longa (máximo 1000 caracteres)' });
        return;
      }
      const message = await this.chatService.sendMessage(data.senderId, {
        matchId: data.matchId,
        content: data.content.trim(),
      });
      this.server.to(`match:${data.matchId}`).emit('newMessage', message);
    } catch (error) {
      client.emit('error', { message: 'Erro ao enviar mensagem' });
    }
  }

  // Notificar que está digitando
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; userId: string },
  ) {
    client.to(`match:${data.matchId}`).emit('userTyping', {
      userId: data.userId,
    });
  }

  // Verificar se usuário está online
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
