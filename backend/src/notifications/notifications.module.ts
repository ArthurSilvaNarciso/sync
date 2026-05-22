import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { RemindersService } from './reminders.service';
import { Notification } from './entities/notification.entity';
import { PushToken } from './entities/push-token.entity';
import { User } from '../users/entities/user.entity';

// Lazy: ScheduleModule só importa se @nestjs/schedule estiver instalado
let ScheduleModule: any;
try { ScheduleModule = require('@nestjs/schedule').ScheduleModule; } catch {}

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, PushToken, User]),
    ...(ScheduleModule ? [ScheduleModule.forRoot()] : []),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, RemindersService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
