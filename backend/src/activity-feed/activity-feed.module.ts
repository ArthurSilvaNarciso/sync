import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityFeedController } from './activity-feed.controller';
import { ActivityFeedService } from './activity-feed.service';
import { ActivityFeedPost } from './activity-feed.entity';
import { FeedComment } from './feed-comment.entity';
import { FeedLike } from './feed-like.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityFeedPost, FeedComment, FeedLike])],
  controllers: [ActivityFeedController],
  providers: [ActivityFeedService],
  exports: [ActivityFeedService],
})
export class ActivityFeedModule {}
