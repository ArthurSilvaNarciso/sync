import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { captureException } from './sentry.init';

/**
 * Filter global que:
 * - Reporta exceções 5xx (e inesperadas) ao Sentry
 * - Não reporta 4xx esperadas (Bad Request, Unauthorized, etc)
 * - Mantém formato de resposta NestJS padrão
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('SentryFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      message = typeof resp === 'string' ? resp : (resp as any)?.message || resp;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Reporta apenas 5xx ou erros não-HTTP ao Sentry
    if (status >= 500 || !(exception instanceof HttpException)) {
      captureException(exception, {
        url: request.url,
        method: request.method,
        userId: (request as any).user?.id,
        ip: request.ip,
      });
      if (exception instanceof Error) {
        this.logger.error(`[${request.method} ${request.url}] ${exception.message}`, exception.stack);
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
