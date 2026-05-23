import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MatchingModule } from './matching/matching.module';
import { ChatModule } from './chat/chat.module';
import { EventsModule } from './events/events.module';
import { ActivitiesModule } from './activities/activities.module';
import { RankingModule } from './ranking/ranking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WeatherModule } from './weather/weather.module';
import { AchievementsModule } from './achievements/achievements.module';
import { StatsModule } from './stats/stats.module';
import { StoriesModule } from './stories/stories.module';
import { GroupsModule } from './groups/groups.module';
import { ActivityFeedModule } from './activity-feed/activity-feed.module';
import { SecurityModule } from './common/security/security.module';
import { SeedModule } from './common/seed/seed.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FollowsModule } from './follows/follows.module';
import { SegmentsModule } from './segments/segments.module';
import { CoachModule } from './coach/coach.module';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    // Variáveis de ambiente
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global (anti brute-force e abuso)
    // O `default` é usado quando rotas declaram @Throttle({ default: ... })
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },  // 120 req/min por IP
      { name: 'burst', ttl: 1_000, limit: 20 },      // 20 req/s
      { name: 'long', ttl: 3600_000, limit: 2000 },  // 2k req/h
    ]),
    // Servir arquivos estáticos (avatares, fotos de eventos, etc.)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    // Conexão com PostgreSQL
    TypeOrmModule.forRoot(databaseConfig()),
    // Security primeiro (audit log usado por outros módulos)
    SecurityModule,
    // Módulos da aplicação
    AuthModule,
    UsersModule,
    MatchingModule,
    ChatModule,
    EventsModule,
    ActivitiesModule,
    RankingModule,
    NotificationsModule,
    WeatherModule,
    AchievementsModule,
    StatsModule,
    StoriesModule,
    GroupsModule,
    ActivityFeedModule,
    SeedModule,
    SubscriptionsModule,
    FeedbackModule,
    FollowsModule,
    SegmentsModule,
    CoachModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
