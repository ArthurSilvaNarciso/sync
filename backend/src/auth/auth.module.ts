import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './guards/jwt.strategy';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // Em produção exige JWT_SECRET configurado. Falha early se não tiver.
      secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('JWT_SECRET é obrigatório em produção') })()
        : 'sync-dev-secret-CHANGE-IN-PROD'),
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshTokenService],
  exports: [AuthService, JwtModule, RefreshTokenService],
})
export class AuthModule {}
