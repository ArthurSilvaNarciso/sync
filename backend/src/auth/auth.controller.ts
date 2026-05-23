import { Controller, Post, Get, Delete, Body, Req, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

class RefreshDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refresh: RefreshTokenService,
  ) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 3 } }) // 3 registros / minuto / IP
  @ApiOperation({ summary: 'Cadastrar novo usuário' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req);
  }

  @Post('login')
  @Throttle({ default: { ttl: 300_000, limit: 5 } }) // 5 tentativas / 5 min / IP
  @ApiOperation({ summary: 'Login com email e senha' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 300_000, limit: 3 } }) // 3 / 5 min / IP
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto.email, req);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 300_000, limit: 5 } })
  @ApiOperation({ summary: 'Redefinir senha com token' })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto.token, dto.newPassword, req);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 300_000, limit: 5 } })
  @ApiOperation({ summary: 'Alterar senha (autenticado, exige senha atual)' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword, req);
    return { ok: true, message: 'Senha alterada com sucesso' };
  }

  @Post('google')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Login/registro via Google OAuth (idToken do Google Sign-In)' })
  async google(@Body() body: { idToken: string }, @Req() req: Request) {
    // Stub: precisa configurar GOOGLE_CLIENT_ID e implementar verificação real
    // do idToken via google-auth-library. Aqui retorna instrução clara.
    if (!process.env.GOOGLE_CLIENT_ID) {
      return {
        error: 'oauth_not_configured',
        message: 'Google OAuth não configurado. Setar GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET no Railway.',
        howTo: 'https://console.cloud.google.com/apis/credentials → criar OAuth 2.0 Client ID web + mobile',
      };
    }
    // TODO: implementar com google-auth-library
    return { error: 'not_implemented' };
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Trocar refresh por novo par (access + refresh)' })
  async refreshTokens(@Body() dto: RefreshDto, @Req() req: Request) {
    const pair = await this.refresh.refresh(
      dto.refreshToken,
      (id) => this.authService.validateUser(id),
      req,
    );
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      refreshExpiresAt: pair.refreshExpiresAt,
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Invalida refresh token (logout)' })
  async logout(@Body() dto: RefreshDto) {
    await this.refresh.revokeFamily(dto.refreshToken);
    return { ok: true };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar sessões ativas (devices logados)' })
  sessions(@CurrentUser() user: User) {
    return this.refresh.listSessions(user.id);
  }

  @Delete('sessions/:familyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revogar uma sessão específica' })
  revokeSession(@CurrentUser() user: User, @Param('familyId') familyId: string) {
    return this.refresh.revokeSession(user.id, familyId);
  }
}
