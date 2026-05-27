import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Upload do avatar como base64 (max ~400KB após compressão)' })
  async uploadAvatar(
    @CurrentUser() user: User,
    @Body('avatarBase64') avatarBase64: string,
  ) {
    if (!avatarBase64 || typeof avatarBase64 !== 'string') {
      throw new BadRequestException('Imagem não enviada');
    }
    if (!avatarBase64.startsWith('data:image/')) {
      throw new BadRequestException('Formato inválido. Envie data:image/... base64.');
    }
    // ~400KB de imagem comprimida equivale a ~530K chars de base64
    if (avatarBase64.length > 550_000) {
      throw new BadRequestException('Imagem muito grande. Máximo ~400KB após compressão.');
    }
    return this.usersService.updateAvatar(user.id, avatarBase64);
  }

  @Post('me/banner')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload do banner como base64 (max ~800KB)' })
  async uploadBanner(
    @CurrentUser() user: User,
    @Body('bannerBase64') bannerBase64: string,
  ) {
    if (!bannerBase64 || typeof bannerBase64 !== 'string') {
      throw new BadRequestException('Imagem não enviada');
    }
    if (!bannerBase64.startsWith('data:image/')) {
      throw new BadRequestException('Formato inválido. Envie data:image/... base64.');
    }
    if (bannerBase64.length > 1_100_000) {
      throw new BadRequestException('Imagem muito grande. Máximo ~800KB após compressão.');
    }
    return this.usersService.updateBanner(user.id, bannerBase64);
  }

  @Post('me/photos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de fotos do perfil como base64 (máx 5, cada ~400KB)' })
  async uploadProfilePhotos(
    @CurrentUser() user: User,
    @Body('photos') photos: string[],
  ) {
    if (!Array.isArray(photos) || photos.length < 3) {
      throw new BadRequestException('Envie pelo menos 3 fotos para continuar.');
    }
    if (photos.length > 5) {
      throw new BadRequestException('Máximo de 5 fotos permitido.');
    }
    for (const photo of photos) {
      if (typeof photo !== 'string' || !photo.startsWith('data:image/')) {
        throw new BadRequestException('Formato inválido. Cada foto deve ser data:image/... base64.');
      }
      if (photo.length > 550_000) {
        throw new BadRequestException('Uma das fotos é muito grande. Máximo ~400KB cada após compressão.');
      }
    }
    return this.usersService.updateProfilePhotos(user.id, photos);
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
