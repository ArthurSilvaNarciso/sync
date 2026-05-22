// Cron de lembretes opt-in: hidratação 3x/dia + lembrete diário de treino.
// Usa @nestjs/schedule (cron) — lazy require pra não quebrar build se pacote
// ainda não estiver instalado.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PushService } from './push.service';

let Cron: any;
try { Cron = require('@nestjs/schedule').Cron; } catch {}

@Injectable()
export class RemindersService implements OnModuleInit {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly push: PushService,
  ) {}

  onModuleInit() {
    if (!Cron) {
      this.logger.warn('@nestjs/schedule indisponível — reminders desativados');
    }
  }

  // Hidratação: 10h, 14h, 17h
  @Cron?.('0 10,14,17 * * *')
  async hydrationReminder() {
    if (process.env.REMINDERS_DISABLED === 'true') return;
    try {
      const users = await this.userRepo.find({ where: { isActive: true }, take: 5000 });
      const messages = ['Hora da água! 💧', 'Beba um copo agora 💦', 'Hidratação check ⛅'];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      for (const u of users) {
        await this.push.sendToUser(u.id, 'Hidratação', msg, { type: 'hydration' }).catch(() => {});
      }
      this.logger.log(`Hydration reminder enviado pra ${users.length} usuários`);
    } catch (e) {
      this.logger.warn(`hydrationReminder falhou: ${(e as Error).message}`);
    }
  }

  // Lembrete diário: 7h da manhã
  @Cron?.('0 7 * * *')
  async dailyTrainingReminder() {
    if (process.env.REMINDERS_DISABLED === 'true') return;
    try {
      const users = await this.userRepo.find({ where: { isActive: true }, take: 5000 });
      for (const u of users) {
        await this.push
          .sendToUser(u.id, 'Bom dia! 🌅', 'Pronto pro treino de hoje? Bora!', { type: 'training_daily' })
          .catch(() => {});
      }
    } catch (e) {
      this.logger.warn(`dailyTrainingReminder falhou: ${(e as Error).message}`);
    }
  }
}
