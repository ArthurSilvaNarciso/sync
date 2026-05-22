import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
import { User } from '../../users/entities/user.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { ActivityPoint } from '../../activities/entities/activity-point.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Activity, ActivityPoint])],
  controllers: [SeedController],
})
export class SeedModule {}
