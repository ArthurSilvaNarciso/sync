import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SegmentsController } from './segments.controller';
import { Segment } from './segment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Segment])],
  controllers: [SegmentsController],
})
export class SegmentsModule {}
