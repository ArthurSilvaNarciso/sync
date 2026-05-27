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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Activity } from './entities/activity.entity';
import { ActivityPoint } from './entities/activity-point.entity';
import { haversineMeters } from '../common/utils/haversine';

// Gateway WebSocket para tracking em tempo real
// Eventos:
//  - joinActivity { activityId } → entra na sala daquela atividade
//  - point { activityId, lat, lng, alt?, timestamp } → atleta streama posição
//  - livePoint (broadcast) → seguidores recebem em tempo real
//  - finishActivity → fecha a sala
@WebSocketGateway({
  cors: { origin: true, credentials: false },
  namespace: '/tracking',
})
export class ActivitiesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId por socket após autenticação
  private socketUser: Map<string, string> = new Map();
  // Atividades que o socket pode escrever (owner verificado)
  private socketActivities: Map<string, Set<string>> = new Map();

  // Buffer de pontos por atividade para persistência em batch (reduz writes no SQLite)
  private pointBuffer: Map<string, { lat: number; lng: number; alt?: number; ts: Date }[]> = new Map();
  // Cache do último ponto por atividade (para snapshot ao novo seguidor)
  private lastPoint: Map<string, { lat: number; lng: number; ts: Date; distance: number }> = new Map();

  private flushInterval: NodeJS.Timeout;

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(ActivityPoint)
    private readonly pointRepository: Repository<ActivityPoint>,
    private readonly jwtService: JwtService,
  ) {
    // Persiste buffer a cada 3s
    this.flushInterval = setInterval(() => this.flushBuffers().catch(() => undefined), 3000);
  }

  async handleConnection(client: Socket) {
    // Autenticação por JWT no handshake.
    // SECURITY: token lido APENAS de handshake.auth — nunca de query params
    // (query params ficam em access logs do servidor e no histórico do browser).
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      // Anônimos podem APENAS observar (joinActivity em modo read-only)
      // — qualquer envio de 'point' será rejeitado.
      return;
    }
    try {
      const payload: any = this.jwtService.verify(token);
      if (payload?.sub) {
        this.socketUser.set(client.id, payload.sub);
      }
    } catch {
      // Token inválido — desconecta
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.socketUser.delete(client.id);
    this.socketActivities.delete(client.id);
  }

  @SubscribeMessage('joinActivity')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    if (!data?.activityId) return { ok: false };
    const room = `activity:${data.activityId}`;
    await client.join(room);

    // Envia snapshot dos pontos já existentes ao novo seguidor
    const last = this.lastPoint.get(data.activityId);
    if (last) {
      client.emit('livePoint', {
        activityId: data.activityId,
        latitude: last.lat,
        longitude: last.lng,
        timestamp: last.ts.toISOString(),
        distance: last.distance,
        snapshot: true,
      });
    }
    return { ok: true, room };
  }

  @SubscribeMessage('point')
  async onPoint(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      activityId: string;
      latitude: number;
      longitude: number;
      altitude?: number;
      timestamp?: string;
    },
  ) {
    try {
      if (!data?.activityId) return { ok: false };

      // ===== AUTH CHECK =====
      // Só o dono da atividade pode enviar pontos.
      const userId = this.socketUser.get(client.id);
      if (!userId) return { ok: false, error: 'unauthenticated' };

      // Cache de verificação por socket+atividade
      let owned = this.socketActivities.get(client.id);
      if (!owned) {
        owned = new Set();
        this.socketActivities.set(client.id, owned);
      }
      if (!owned.has(data.activityId)) {
        const activity = await this.activityRepository.findOne({
          where: { id: data.activityId },
          select: ['id', 'user_id', 'isCompleted'],
        });
        if (!activity || activity.user_id !== userId) {
          return { ok: false, error: 'forbidden' };
        }
        if (activity.isCompleted) {
          return { ok: false, error: 'activity_completed' };
        }
        owned.add(data.activityId);
      }
      // Sanity check coordenadas
      if (
        data.latitude < -90 || data.latitude > 90 ||
        data.longitude < -180 || data.longitude > 180
      ) {
        return { ok: false, error: 'invalid coords' };
      }
      const ts = data.timestamp ? new Date(data.timestamp) : new Date();

      // Atualiza distância acumulada baseado no último ponto
      const prev = this.lastPoint.get(data.activityId);
      let distance = prev?.distance ?? 0;
      if (prev) {
        distance += haversineMeters(prev.lat, prev.lng, data.latitude, data.longitude);
      }
      this.lastPoint.set(data.activityId, {
        lat: data.latitude,
        lng: data.longitude,
        ts,
        distance,
      });

      // Adiciona ao buffer (persistido em batch)
      const buf = this.pointBuffer.get(data.activityId) || [];
      buf.push({ lat: data.latitude, lng: data.longitude, alt: data.altitude, ts });
      this.pointBuffer.set(data.activityId, buf);

      // Broadcast pra seguidores na sala
      this.server.to(`activity:${data.activityId}`).emit('livePoint', {
        activityId: data.activityId,
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,
        timestamp: ts.toISOString(),
        distance,
      });

      return { ok: true };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ActivitiesGateway] erro em point:', err);
      return { ok: false };
    }
  }

  @SubscribeMessage('finishActivity')
  async onFinish(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    if (!data?.activityId) return { ok: false };
    // Ownership check — só o dono pode finalizar a atividade via socket
    const userId = this.socketUser.get(client.id);
    if (!userId) return { ok: false, error: 'unauthenticated' };
    const activity = await this.activityRepository.findOne({
      where: { id: data.activityId },
      select: ['id', 'user_id'],
    });
    if (!activity || activity.user_id !== userId) {
      return { ok: false, error: 'forbidden' };
    }
    await this.flushActivity(data.activityId);
    this.server.to(`activity:${data.activityId}`).emit('activityFinished', {
      activityId: data.activityId,
    });
    this.lastPoint.delete(data.activityId);
    return { ok: true };
  }

  private async flushBuffers() {
    for (const activityId of [...this.pointBuffer.keys()]) {
      await this.flushActivity(activityId);
    }
  }

  private async flushActivity(activityId: string) {
    const buf = this.pointBuffer.get(activityId);
    if (!buf || buf.length === 0) return;
    this.pointBuffer.delete(activityId);

    try {
      const rows = buf.map((p) =>
        this.pointRepository.create({
          activity_id: activityId,
          latitude: p.lat,
          longitude: p.lng,
          altitude: p.alt,
          timestamp: p.ts,
        }),
      );
      await this.pointRepository.save(rows);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ActivitiesGateway] flush falhou:', err);
    }
  }
}
