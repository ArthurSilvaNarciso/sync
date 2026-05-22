import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivityFeedService } from './activity-feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Activity Feed')
@Controller('api/feed')
export class ActivityFeedController {
  constructor(private readonly service: ActivityFeedService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Feed público (posts de atividades)' })
  feed(@Query('page') page?: string) {
    return this.service.feed(page ? parseInt(page, 10) : 1);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Posts de um usuário' })
  userPosts(@Param('userId') userId: string, @Query('page') page?: string) {
    return this.service.byUser(userId, page ? parseInt(page, 10) : 1);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Postar atividade no feed' })
  create(@CurrentUser() user: User, @Body() body: any) {
    return this.service.create(user.id, body);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like em post do feed' })
  like(@Param('id') id: string) {
    return this.service.like(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar próprio post' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.delete(user.id, id);
  }
}
