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
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

// Gateway WebSocket para chat em tempo real.
// SECURITY: autenticação via JWT bearer no handshake.auth.token.
// O senderId é SEMPRE extraído do token — nunca confiamos no payload do cliente.
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
      : process.env.NODE_ENV === 'production'
        ? false
        : true,
    credentials: false,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // socketId → userId (só sockets autenticados entram aqui)
  private socketToUser = new Map<string, string>();

  // Rate limiting por socket: socketId → { count, windowStart }
  // Máximo de 30 mensagens por minuto por conexão
  private readonly MSG_LIMIT = 30;
  private readonly MSG_WINDOW_MS = 60_000;
  private msgRate = new Map<string, { count: number; windowStart: number }>();

  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const rec = this.msgRate.get(socketId);
    if (!rec || now - rec.windowStart > this.MSG_WINDOW_MS) {
      this.msgRate.set(socketId, { count: 1, windowStart: now });
      return true;
    }
    if (rec.count >= this.MSG_LIMIT) return false;
    rec.count++;
    return true;
  }

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        client.emit('auth_error', { message: 'Token ausente' });
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      const userId = payload.sub;

      if (!userId) {
        client.emit('auth_error', { message: 'Token inválido' });
        client.disconnect(true);
        return;
      }

      this.socketToUser.set(client.id, userId);
      this.server.emit('userOnline', { userId });
    } catch {
      client.emit('auth_error', { message: 'Autenticação falhou' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.socketToUser.delete(client.id);
      this.server.emit('userOffline', { userId });
    }
    this.msgRate.delete(client.id);
  }

  // Entrar na room do match para receber mensagens em tempo real
  @SubscribeMessage('joinChat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      client.emit('error', { message: 'Não autenticado' });
      return;
    }
    if (data?.matchId && typeof data.matchId === 'string') {
      client.join(`match:${data.matchId}`);
    }
  }

  // Enviar mensagem via WebSocket
  // senderId vem do JWT (server-side) — nunca do payload do cliente
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; content: string },
  ) {
    const senderId = this.socketToUser.get(client.id);
    if (!senderId) {
      client.emit('error', { message: 'Não autenticado' });
      return;
    }
    if (!this.checkRateLimit(client.id)) {
      client.emit('error', { message: 'Muitas mensagens. Aguarde um momento.' });
      return;
    }
    try {
      if (!data?.matchId || !data.content?.trim()) {
        client.emit('error', { message: 'Dados da mensagem inválidos' });
        return;
      }
      if (data.content.trim().length > 1000) {
        client.emit('error', { message: 'Mensagem muito longa (máximo 1000 caracteres)' });
        return;
      }
      const message = await this.chatService.sendMessage(senderId, {
        matchId: data.matchId,
        content: data.content.trim(),
      });
      this.server.to(`match:${data.matchId}`).emit('newMessage', message);
    } catch {
      client.emit('error', { message: 'Erro ao enviar mensagem' });
    }
  }

  // Notificar que está digitando (userId vem do JWT)
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId || !data?.matchId) return;
    client.to(`match:${data.matchId}`).emit('userTyping', { userId });
  }

  isUserOnline(userId: string): boolean {
    return [...this.socketToUser.values()].includes(userId);
  }
}
