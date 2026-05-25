import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ReportUserDto } from './dto/report-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter perfil do usuário logado' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar perfil' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Completar onboarding esportivo' })
  completeOnboarding(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.completeOnboarding(user.id, dto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload do avatar do usuário (max 5MB)' })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname).toLowerCase().slice(0, 5) || '.jpg';
          const random = Math.random().toString(36).slice(2, 10);
          cb(null, `${Date.now()}-${random}${safeExt}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype)) {
          return cb(new BadRequestException('Formato inválido. Use JPG, PNG, WEBP ou GIF.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    // Strip EXIF + resize (privacidade + perf). Falha não bloqueia upload.
    try {
      const { stripExifInPlace } = await import('../common/utils/image-sanitize.util');
      await stripExifInPlace(file.path, { maxWidth: 1024, maxHeight: 1024, quality: 88 });
    } catch {}
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}/uploads/avatars/${file.filename}`;
    return this.usersService.updateAvatar(user.id, url);
  }

  @Put('location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar localização' })
  updateLocation(
    @CurrentUser() user: User,
    @Body() body: { latitude: number; longitude: number; city?: string },
  ) {
    return this.usersService.updateLocation(
      user.id,
      body.latitude,
      body.longitude,
      body.city,
    );
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar usuários por nome' })
  searchUsers(
    @CurrentUser() user: User,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.searchUsers(
      query,
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('blocked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuários bloqueados' })
  getBlockedUsers(@CurrentUser() user: User) {
    return this.usersService.getBlockedUsers(user.id);
  }

  // ===== LGPD/GDPR =====
  @Get('me/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exportar todos os dados pessoais (LGPD/GDPR)' })
  async exportData(@CurrentUser() user: User) {
    const full = await this.usersService.findById(user.id);
    return {
      generatedAt: new Date().toISOString(),
      user: full,
      note: 'Este JSON contém todos os dados pessoais armazenados sobre você. Para deletar permanentemente, use DELETE /users/me.',
    };
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar minha conta permanentemente (LGPD/GDPR)' })
  async deleteMe(@CurrentUser() user: User) {
    // Soft delete: anonimiza ao invés de remover (preserva integridade de atividades em grupos)
    return this.usersService.anonymizeUser(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver perfil de outro usuário' })
  getUserProfile(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post(':id/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bloquear usuário' })
  blockUser(@CurrentUser() user: User, @Param('id') id: string) {
    return this.usersService.blockUser(user.id, id);
  }

  @Delete(':id/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desbloquear usuário' })
  unblockUser(@CurrentUser() user: User, @Param('id') id: string) {
    return this.usersService.unblockUser(user.id, id);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reportar usuário' })
  reportUser(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReportUserDto,
  ) {
    return this.usersService.reportUser(user.id, id, dto.reason, dto.description);
  }
}
