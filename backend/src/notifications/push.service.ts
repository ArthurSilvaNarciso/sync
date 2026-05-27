// Envio de push via Expo Push API (free, sem key)
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushToken } from './entities/push-token.entity';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: 'default';
  channelId?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly EXPO_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(
    @InjectRepository(PushToken)
    private readonly tokenRepo: Repository<PushToken>,
  ) {}

  // Registra/atualiza token de um device
  async registerToken(
    userId: string,
    token: string,
    platform?: string,
    deviceName?: string,
  ): Promise<PushToken> {
    // Validação básica: token não pode ser vazio nem gigante
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new BadRequestException('Push token inválido');
    }
    if (token.length > 300) {
      throw new BadRequestException('Push token muito longo');
    }
    // aceita tokens Expo (ExponentPushToken[…] / ExpoPushToken[…]) e raw FCM/APNs
    const existing = await this.tokenRepo.findOne({
      where: { user_id: userId, token },
    });
    if (existing) {
      existing.lastSeenAt = new Date();
      if (platform) existing.platform = platform;
      if (deviceName) existing.deviceName = deviceName;
      return this.tokenRepo.save(existing);
    }
    return this.tokenRepo.save(
      this.tokenRepo.create({
        user_id: userId,
        token,
        provider: 'expo',
        platform,
        deviceName: deviceName ?? null,
      }),
    );
  }

  // Remove token (logout)
  async removeToken(userId: string, token: string): Promise<void> {
    await this.tokenRepo.delete({ user_id: userId, token });
  }

  // Envia push pra todos os devices do user
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{ sent: number; failed: number }> {
    const tokens = await this.tokenRepo.find({ where: { user_id: userId } });
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      data: data || {},
      sound: 'default',
      channelId: 'default',
    }));

    return this.sendBatch(messages);
  }

  // Envia push pra múltiplos users em batch
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{ sent: number; failed: number }> {
    if (userIds.length === 0) return { sent: 0, failed: 0 };
    const tokens = await this.tokenRepo
      .createQueryBuilder('t')
      .where('t.user_id IN (:...ids)', { ids: userIds })
      .getMany();
    if (tokens.length === 0) return { sent: 0, failed: 0 };

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      data: data || {},
      sound: 'default',
      channelId: 'default',
    }));

    return this.sendBatch(messages);
  }

  // Envia até 100 por request (limite Expo)
  private async sendBatch(
    messages: ExpoPushMessage[],
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    const chunks: ExpoPushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      try {
        const res = await fetch(this.EXPO_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) {
          this.logger.warn(`Expo Push falhou: ${res.status}`);
          failed += chunk.length;
          continue;
        }
        const data: any = await res.json();
        const items: any[] = Array.isArray(data?.data) ? data.data : [];
        items.forEach((r) => {
          if (r.status === 'ok') sent++;
          else failed++;
        });
      } catch (err) {
        this.logger.error(`Erro Expo Push: ${err}`);
        failed += chunk.length;
      }
    }
    return { sent, failed };
  }
}
