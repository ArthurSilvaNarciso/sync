import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitiesGateway } from './activities.gateway';
import { Activity } from './entities/activity.entity';
import { ActivityPoint } from './entities/activity-point.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, ActivityPoint])],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivitiesGateway],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
