/**
 * Inicialização de Sentry. NO-OP se SENTRY_DSN não estiver setado.
 *
 * Deve ser chamado o mais cedo possível no bootstrap (antes do AppModule)
 * para capturar erros de instrumentation.
 */
export function initSentry(): { enabled: boolean; dsn?: string } {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return { enabled: false };

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    let profilingIntegration: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { nodeProfilingIntegration } = require('@sentry/profiling-node');
      profilingIntegration = nodeProfilingIntegration();
    } catch {}

    const env = process.env.NODE_ENV || 'development';
    const release = process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || undefined;

    Sentry.init({
      dsn,
      environment: env,
      release,
      sendDefaultPii: false,
      tracesSampleRate: env === 'production' ? 0.1 : 1.0,
      profilesSampleRate: env === 'production' ? 0.1 : 0.0,
      integrations: [
        ...(profilingIntegration ? [profilingIntegration] : []),
      ],
      // Não envia eventos com PII em request bodies
      beforeSend(event: any) {
        if (event?.request?.data) {
          try {
            const data = typeof event.request.data === 'string' ? JSON.parse(event.request.data) : event.request.data;
            ['password', 'token', 'refreshToken', 'apiKey', 'authorization', 'cpf', 'creditCard']
              .forEach(k => { if (data && k in data) data[k] = '[redacted]'; });
            event.request.data = data;
          } catch {}
        }
        return event;
      },
      ignoreErrors: [
        // Erros benignos comuns
        'AbortError',
        'ECONNRESET',
        'ECONNREFUSED',
        'NotFoundException',
        'UnauthorizedException',
      ],
    });
    return { enabled: true, dsn };
  } catch (e) {
    return { enabled: false };
  }
}

export function captureException(err: unknown, ctx?: Record<string, any>): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
  } catch {}
}
