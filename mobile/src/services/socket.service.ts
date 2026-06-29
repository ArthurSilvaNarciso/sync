import { io, Socket } from 'socket.io-client';
import { secureStorage } from './secure-storage';
import { API_HOST } from './api';

// Deriva o namespace do host da API (mesmo servidor, porta 3000)
const SOCKET_URL = `${API_HOST}/chat`;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 20000; // teto do backoff — nunca desiste de vez

export type SocketStatus = 'connected' | 'connecting' | 'disconnected';

type Handler = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private jwtToken: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private status: SocketStatus = 'disconnected';

  // Handlers registrados pela UI — re-vinculados a CADA novo socket pra que a
  // conversa não "morra" depois de uma reconexão (bug clássico: o listener
  // ficava no socket antigo).
  private handlers: Record<string, Handler | undefined> = {};
  // Salas em que o usuário está — re-entramos automaticamente ao reconectar.
  private joinedRooms = new Set<string>();
  // Observadores de status (banner "reconectando…", etc.)
  private statusListeners = new Set<(s: SocketStatus) => void>();

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

  private setStatus(s: SocketStatus) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((fn) => {
      try { fn(s); } catch { /* noop */ }
    });
  }

  getStatus(): SocketStatus {
    return this.status;
  }

  /** Inscreve um observador no status de conexão. Retorna função de unsubscribe. */
  onStatusChange(fn: (s: SocketStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status); // emite o estado atual de imediato
    return () => this.statusListeners.delete(fn);
  }

  private createConnection(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      this.setStatus('connecting');

      this.socket = io(SOCKET_URL, {
        // SECURITY: JWT no handshake.auth, nunca em query params (evita logging em proxies)
        auth: { token },
        // websocket primeiro; cai pra polling se o upgrade WS falhar atrás do
        // proxy do Railway (evita "falha de conexão" no chat)
        transports: ['websocket', 'polling'],
        reconnection: false, // gerenciamos manualmente com backoff exponencial
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        // Re-vincula handlers e re-entra nas salas — chave pra reconexão funcionar
        this.rebindHandlers();
        this.joinedRooms.forEach((matchId) => {
          this.socket?.emit('joinChat', { matchId });
        });
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (err) => {
        this.setStatus('disconnected');
        if (this.reconnectAttempts === 0) {
          reject(err);
        }
        this.scheduleReconnect();
      });

      this.socket.on('disconnect', () => {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      });

      // Servidor nos expulsa se o token expirar
      this.socket.on('auth_error', () => {
        this.jwtToken = null;
        this.disconnect();
      });
    });
  }

  /** Re-aplica todos os handlers guardados ao socket atual. */
  private rebindHandlers() {
    if (!this.socket) return;
    for (const [event, handler] of Object.entries(this.handlers)) {
      if (!handler) continue;
      this.socket.off(event);
      this.socket.on(event, handler);
    }
  }

  private scheduleReconnect() {
    if (!this.jwtToken) return; // só desiste se não há sessão
    if (this.reconnectTimer) return;

    // Backoff exponencial com teto — tenta pra sempre (até desconectar de vez)
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY_MS,
    );
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

  /** Força uma reconexão imediata (ex.: quando a rede volta). */
  reconnectNow() {
    if (!this.jwtToken || this.socket?.connected) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.createConnection(this.jwtToken).catch(() => {});
  }

  joinChat(matchId: string) {
    this.joinedRooms.add(matchId);
    this.socket?.emit('joinChat', { matchId });
  }

  /** senderId is derived server-side from the JWT — do not pass it */
  sendMessage(matchId: string, content: string) {
    this.socket?.emit('sendMessage', { matchId, content });
  }

  onNewMessage(callback: (message: any) => void) {
    this.handlers['newMessage'] = callback;
    this.socket?.off('newMessage');
    this.socket?.on('newMessage', callback);
  }

  onTyping(callback: (data: { userId: string }) => void) {
    this.handlers['userTyping'] = callback;
    this.socket?.off('userTyping');
    this.socket?.on('userTyping', callback);
  }

  /** userId is derived server-side from the JWT — do not pass it */
  emitTyping(matchId: string) {
    this.socket?.emit('typing', { matchId });
  }

  /** Alterna uma reação (emoji) numa mensagem. */
  reactMessage(matchId: string, messageId: string, emoji: string) {
    this.socket?.emit('reactMessage', { matchId, messageId, emoji });
  }

  /** Ouve atualizações de reações (mapa emoji -> userIds). */
  onMessageReaction(callback: (data: { messageId: string; reactions: Record<string, string[]> }) => void) {
    this.handlers['messageReaction'] = callback;
    this.socket?.off('messageReaction');
    this.socket?.on('messageReaction', callback);
  }

  onUserOnline(callback: (data: { userId: string }) => void) {
    this.handlers['userOnline'] = callback;
    this.socket?.off('userOnline');
    this.socket?.on('userOnline', callback);
  }

  onUserOffline(callback: (data: { userId: string }) => void) {
    this.handlers['userOffline'] = callback;
    this.socket?.off('userOffline');
    this.socket?.on('userOffline', callback);
  }

  leaveChat(matchId: string) {
    this.joinedRooms.delete(matchId);
    this.socket?.emit('leaveChat', { matchId });
  }

  /** Notify server that all messages in a match have been read */
  markRead(matchId: string) {
    this.socket?.emit('markRead', { matchId });
  }

  /** Listen for read receipts from the other participant */
  onMessagesRead(callback: (data: { matchId: string; readBy: string; readAt: string }) => void) {
    this.handlers['messagesRead'] = callback;
    this.socket?.off('messagesRead');
    this.socket?.on('messagesRead', callback);
  }

  /** Send a voice message as base64 audio content */
  sendAudioMessage(matchId: string, audioBase64: string) {
    this.socket?.emit('sendMessage', { matchId, content: audioBase64, type: 'audio' });
  }

  /** @deprecated use emitTyping(matchId) — userId comes from the server JWT */
  sendTyping(matchId: string) {
    this.emitTyping(matchId);
  }

  /** Remove um handler específico (ex.: ao desmontar a tela de conversa). */
  clearMessageHandlers() {
    this.handlers = {};
    if (this.socket) {
      ['newMessage', 'userTyping', 'userOnline', 'userOffline', 'messagesRead', 'messageReaction'].forEach((e) =>
        this.socket?.off(e),
      );
    }
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
    this.handlers = {};
    this.joinedRooms.clear();
    this.setStatus('disconnected');
  }
}

export const socketService = new SocketService();
