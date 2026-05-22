import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitiesGateway } from './activities.gateway';
import { Activity } from './entities/activity.entity';
import { ActivityPoint } from './entities/activity-point.entity';
import { ActivityComment } from './entities/activity-comment.entity';
import { ActivityKudos } from './entities/activity-kudos.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityPoint, ActivityComment, ActivityKudos]),
    NotificationsModule,
    AuthModule, // pra JwtService no gateway
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivitiesGateway],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
