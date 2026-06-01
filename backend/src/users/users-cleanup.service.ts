// Cron de purga LGPD: remove definitivamente contas soft-deletadas há +30 dias.
// Usa @nestjs/schedule. Se o pacote não estiver instalado, vira noop.
import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from './users.service';

// Lazy import — decorator opcional pra não quebrar o build se o pkg faltar
let Cron: any = () => () => undefined;
try { Cron = require('@nestjs/schedule').Cron; } catch {}

@Injectable()
export class UsersCleanupService {
  private readonly logger = new Logger(UsersCleanupService.name);

  constructor(private readonly usersService: UsersService) {}

  // Todo dia às 3h da manhã
  @Cron('0 3 * * *')
  async purgeExpiredDeletions() {
    if (process.env.PURGE_DISABLED === 'true') return;
    try {
      const removed = await this.usersService.purgeDeletedAccounts(30);
      if (removed > 0) {
        this.logger.log(`Purga LGPD concluída: ${removed} conta(s) apagada(s) definitivamente`);
      }
    } catch (err) {
      this.logger.error(`Falha na purga LGPD: ${err}`);
    }
  }
}
