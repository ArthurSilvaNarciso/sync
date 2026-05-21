import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Decorator para extrair o usuário autenticado do request
// Uso: @CurrentUser() user: User
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
