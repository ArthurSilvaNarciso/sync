import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { Notification } from './entities/notification.entity';
import { PushToken } from './entities/push-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushToken])],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
