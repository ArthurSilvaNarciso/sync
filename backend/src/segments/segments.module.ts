import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SegmentsController } from './segments.controller';
import { Segment } from './segment.entity';
import { SegmentEffort } from './segment-effort.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Segment, SegmentEffort])],
  controllers: [SegmentsController],
})
export class SegmentsModule {}
