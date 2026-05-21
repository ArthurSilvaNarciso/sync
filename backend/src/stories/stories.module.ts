import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Story, StoryView])],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
