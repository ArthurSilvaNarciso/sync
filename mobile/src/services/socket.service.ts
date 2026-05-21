import { io, Socket } from 'socket.io-client';

const SOCKET_URL = __DEV__
  ? 'http://localhost:3000/chat'
  : 'https://api.sync-app.com/chat';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async connect(userId: string): Promise<Socket> {
    if (this.socket?.connected) return this.socket;

    this.userId = userId;
    this.reconnectAttempts = 0;

    return this.createConnection(userId);
  }

  private createConnection(userId: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      this.socket = io(SOCKET_URL, {
        query: { userId },
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
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || !this.userId) return;
    if (this.reconnectTimer) return;

    const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.userId) {
        this.createConnection(this.userId).catch(() => {});
      }
    }, delay);
  }

  joinChat(matchId: string) {
    this.socket?.emit('joinChat', { matchId });
  }

  sendMessage(matchId: string, senderId: string, content: string) {
    this.socket?.emit('sendMessage', { matchId, senderId, content });
  }

  onNewMessage(callback: (message: any) => void) {
    this.socket?.off('newMessage');
    this.socket?.on('newMessage', callback);
  }

  onTyping(callback: (data: { userId: string }) => void) {
    this.socket?.off('userTyping');
    this.socket?.on('userTyping', callback);
  }

  emitTyping(matchId: string, userId: string) {
    this.socket?.emit('typing', { matchId, userId });
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

  sendTyping(matchId: string, userId: string) {
    this.socket?.emit('typing', { matchId, userId });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.userId = null;
    this.reconnectAttempts = 0;
  }
}

export const socketService = new SocketService();
