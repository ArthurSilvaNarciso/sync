import { io, Socket } from 'socket.io-client';
import { secureStorage } from './secure-storage';
import { API_HOST } from './api';

// Deriva o namespace do host da API (mesmo servidor, porta 3000)
const SOCKET_URL = `${API_HOST}/chat`;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

class SocketService {
  private socket: Socket | null = null;
  private jwtToken: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Conecta ao gateway de chat autenticando via JWT.
   * O userId é extraído do token pelo servidor — não é enviado pelo cliente.
   */
  async connect(): Promise<Socket> {
    if (this.socket?.connected) return this.socket;

    const token = await secureStorage.getItem('@sync:token');
    if (!token) throw new Error('Não autenticado — faça login antes de conectar ao chat');

    this.jwtToken = token;
    this.reconnectAttempts = 0;

    return this.createConnection(token);
  }

  private createConnection(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      this.socket = io(SOCKET_URL, {
        // SECURITY: JWT no handshake.auth, nunca em query params (evita logging em proxies)
        auth: { token },
        transports: ['websocket'],
        reconnection: false, // gerenciamos manualmente com backoff exponencial
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (err) => {
        if (this.reconnectAttempts === 0) {
          reject(err);
        }
        this.scheduleReconnect();
      });

      this.socket.on('disconnect', () => {
        this.scheduleReconnect();
      });

      // Servidor nos expulsa se o token expirar
      this.socket.on('auth_error', () => {
        this.jwtToken = null;
        this.disconnect();
      });
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || !this.jwtToken) return;
    if (this.reconnectTimer) return;

    const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      // Re-read token in case it was refreshed
      const token = await secureStorage.getItem('@sync:token').catch(() => null);
      if (token) {
        this.jwtToken = token;
        this.createConnection(token).catch(() => {});
      }
    }, delay);
  }

  joinChat(matchId: string) {
    this.socket?.emit('joinChat', { matchId });
  }

  /** senderId is derived server-side from the JWT — do not pass it */
  sendMessage(matchId: string, content: string) {
    this.socket?.emit('sendMessage', { matchId, content });
  }

  onNewMessage(callback: (message: any) => void) {
    this.socket?.off('newMessage');
    this.socket?.on('newMessage', callback);
  }

  onTyping(callback: (data: { userId: string }) => void) {
    this.socket?.off('userTyping');
    this.socket?.on('userTyping', callback);
  }

  /** userId is derived server-side from the JWT — do not pass it */
  emitTyping(matchId: string) {
    this.socket?.emit('typing', { matchId });
  }

  onUserOnline(callback: (data: { userId: string }) => void) {
    this.socket?.off('userOnline');
    this.socket?.on('userOnline', callback);
  }

  onUserOffline(callback: (data: { userId: string }) => void) {
    this.socket?.off('userOffline');
    this.socket?.on('userOffline', callback);
  }

  leaveChat(matchId: string) {
    this.socket?.emit('leaveChat', { matchId });
  }

  /** @deprecated use emitTyping(matchId) — userId comes from the server JWT */
  sendTyping(matchId: string) {
    this.emitTyping(matchId);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.jwtToken = null;
    this.reconnectAttempts = 0;
  }
}

export const socketService = new SocketService();
