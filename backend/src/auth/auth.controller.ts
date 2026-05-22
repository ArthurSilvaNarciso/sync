import { Controller, Post, Body, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
