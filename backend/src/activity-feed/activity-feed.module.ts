import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityFeedController } from './activity-feed.controller';
import { ActivityFeedService } from './activity-feed.service';
import { ActivityFeedPost } from './activity-feed.entity';
import { FeedComment } from './feed-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityFeedPost, FeedComment])],
  controllers: [ActivityFeedController],
  providers: [ActivityFeedService],
  exports: [ActivityFeedService],
})
export class ActivityFeedModule {}
