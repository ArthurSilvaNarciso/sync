import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivityFeedService } from './activity-feed.service';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
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
  create(@CurrentUser() user: User, @Body() dto: CreateFeedPostDto) {
    return this.service.create(user.id, dto);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Curtir post do feed (idempotente por usuário)' })
  like(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.like(id, user.id);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Descurtir post do feed (idempotente por usuário)' })
  unlike(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.unlike(id, user.id);
  }

  @Post('liked-ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'IDs de posts curtidos pelo usuário atual (para estado inicial do feed)' })
  likedIds(@CurrentUser() user: User, @Body() body: { postIds: string[] }) {
    return this.service.getLikedPostIds(user.id, body.postIds ?? []);
  }

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar comentários do post' })
  getComments(@Param('id') id: string, @Query('page') page?: string) {
    return this.service.getComments(id, page ? parseInt(page, 10) : 1);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comentar em post' })
  addComment(@CurrentUser() user: User, @Param('id') id: string, @Body() body: { text: string }) {
    return this.service.addComment(id, user.id, body.text);
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar comentário próprio' })
  deleteComment(@CurrentUser() user: User, @Param('id') id: string, @Param('commentId') commentId: string) {
    return this.service.deleteComment(id, commentId, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar próprio post' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.delete(user.id, id);
  }
}
