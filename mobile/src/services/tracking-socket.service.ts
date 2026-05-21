// Socket dedicado para streaming GPS em tempo real (namespace /tracking).
// Separado do chat para isolar reconnects e não competir por bandwidth.
import { io, Socket } from 'socket.io-client';
import { API_HOST } from './api';

const TRACKING_URL = `${API_HOST}/tracking`;

export type LivePoint = {
  activityId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
  distance: number;
  snapshot?: boolean;
};

class TrackingSocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = io(TRACKING_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 10000,
    });
    return this.socket;
  }

  // Para o atleta: começa a streamar pontos da sua própria atividade
  startBroadcasting(activityId: string) {
    const s = this.connect();
    s.emit('joinActivity', { activityId });
  }

  // Para seguidor (com token público): entra na sala daquela atividade
  follow(activityId: string, onPoint: (p: LivePoint) => void, onFinished?: () => void) {
    const s = this.connect();
    s.emit('joinActivity', { activityId });
    s.off('livePoint');
    s.on('livePoint', onPoint);
    if (onFinished) {
      s.off('activityFinished');
      s.on('activityFinished', onFinished);
    }
    return () => {
      s.off('livePoint', onPoint);
      if (onFinished) s.off('activityFinished', onFinished);
    };
  }

  // Atleta envia ponto
  sendPoint(p: {
    activityId: string;
    latitude: number;
    longitude: number;
    altitude?: number;
    timestamp?: string;
  }) {
    if (!this.socket) this.connect();
    this.socket?.emit('point', p);
  }

  finish(activityId: string) {
    this.socket?.emit('finishActivity', { activityId });
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const trackingSocket = new TrackingSocketService();
