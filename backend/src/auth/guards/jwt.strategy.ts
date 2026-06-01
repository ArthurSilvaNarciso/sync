import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

// Estratégia JWT para Passport - valida o token em cada requisição protegida
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // DEVE bater com o secret de assinatura do JwtModule (auth.module.ts),
      // senão todo token é rejeitado (401) em dev sem JWT_SECRET no env.
      secretOrKey: process.env.JWT_SECRET || 'sync-dev-secret-CHANGE-IN-PROD',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
