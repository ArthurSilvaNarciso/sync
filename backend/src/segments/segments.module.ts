import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SegmentsController } from './segments.controller';
import { Segment } from './segment.entity';
import { SegmentEffort } from './segment-effort.entity';
import { SegmentsMatchService } from './segments-match.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { Follow } from '../follows/follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Segment, SegmentEffort, Follow]), NotificationsModule],
  controllers: [SegmentsController],
  providers: [SegmentsMatchService],
  exports: [SegmentsMatchService],
})
export class SegmentsModule {}
