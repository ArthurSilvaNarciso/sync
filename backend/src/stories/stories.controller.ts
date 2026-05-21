import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { StoriesService } from './stories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Stories')
@Controller('api/stories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  // POST /api/stories — upload de mídia + cria story
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Criar story (foto/vídeo, expira em 24h)' })
  @UseInterceptors(
    FileInterceptor('media', {
      storage: diskStorage({
        destination: './uploads/stories',
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname).toLowerCase().slice(0, 5) || '.jpg';
          const random = Math.random().toString(36).slice(2, 10);
          cb(null, `${Date.now()}-${random}${safeExt}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
      fileFilter: (_req, file, cb) => {
        if (!/^(image|video)\/(jpe?g|png|webp|mp4|mov|webm)$/i.test(file.mimetype)) {
          return cb(new BadRequestException('Formato inválido'), false);
        }
        cb(null, true);
      },
    }),
  )
  async create(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { caption?: string; activityId?: string; sport?: string; distanceKm?: string },
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Mídia não enviada');
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}/uploads/stories/${file.filename}`;
    return this.storiesService.create(user.id, url, {
      mediaType: file.mimetype.startsWith('video') ? 'video' : 'image',
      caption: body.caption,
      activityId: body.activityId,
      sport: body.sport,
      distanceKm: body.distanceKm ? parseFloat(body.distanceKm) : undefined,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Feed de stories ativas (últimas 24h)' })
  feed(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.storiesService.getFeed(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Stories de um usuário específico' })
  byUser(@Param('userId') userId: string) {
    return this.storiesService.getByUser(userId);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Marcar story como visto' })
  view(@CurrentUser() user: User, @Param('id') id: string) {
    return this.storiesService.markViewed(id, user.id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Curtir story' })
  like(@Param('id') id: string) {
    return this.storiesService.toggleLike(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar story (só dono)' })
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.storiesService.delete(id, user.id);
  }
}
