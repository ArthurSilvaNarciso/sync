import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { initSentry } from './common/sentry/sentry.init';
import { SentryExceptionFilter } from './common/sentry/sentry.filter';

// Inicializa Sentry o mais cedo possível (no-op se SENTRY_DSN não estiver setado)
const sentry = initSentry();

// Lazy require — pkg pode não estar instalado em dev/local
let basicAuth: any;
try { basicAuth = require('express-basic-auth'); } catch {}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  if (sentry.enabled) logger.log('Sentry error tracking ENABLED');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  // Global exception filter — captura 5xx → Sentry, mantém formato de resposta
  app.useGlobalFilters(new SentryExceptionFilter());

  const isProd = process.env.NODE_ENV === 'production';

  // ===== SECURITY HEADERS =====
  // CSP habilitada com whitelist enxuta. Imagens externas (Unsplash, OSM, avatars)
  // permitidas. Scripts inline NÃO permitidos (XSS defense).
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"], // Expo web exige inline
              styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
              imgSrc: [
                "'self'",
                'data:',
                'blob:',
                'https://images.unsplash.com',
                'https://*.tile.openstreetmap.org',
                'https://cdn.jsdelivr.net',
                'https://*.railway.app',
              ],
              connectSrc: [
                "'self'",
                'https://*.railway.app',
                'https://api.open-meteo.com',
                'https://air-quality-api.open-meteo.com',
                'https://api.sunrise-sunset.org',
                'https://nominatim.openstreetmap.org',
                'https://ipapi.co',
                'https://exp.host',
                'wss://*.railway.app',
              ],
              fontSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // HSTS: força HTTPS por 6 meses em prod
      hsts: isProd ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
      // Permissions-Policy via header customizado (Helmet 7+ não tem builtin)
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use((req: any, res: any, next: any) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
  });

  // ===== VALIDAÇÃO GLOBAL =====
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ===== CORS estrito =====
  // Domínios permitidos vêm de FRONTEND_URL (csv: prod1.com,prod2.com)
  // Fora dev, NÃO usa wildcard regex de subdomínio Vercel — exige domínio explícito.
  const frontendUrls = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Em dev: aceita qualquer origin (Expo dev server muda porta)
      if (!isProd) return callback(null, true);
      // Sem origin (apps nativos, curl) → permitir
      if (!origin) return callback(null, true);
      // Match exato com lista
      if (frontendUrls.includes(origin)) return callback(null, true);
      // Bloqueia o resto
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('CORS blocked'), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
    maxAge: 86400,
  });

  // Trust proxy (Railway envia X-Forwarded-Proto)
  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp?.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  // ===== SWAGGER — protegido em prod =====
  if (!isProd || process.env.SWAGGER_USER) {
    if (isProd && process.env.SWAGGER_USER && process.env.SWAGGER_PASS && basicAuth) {
      app.use(
        ['/api/docs', '/api/docs-json'],
        basicAuth({
          challenge: true,
          users: { [process.env.SWAGGER_USER]: process.env.SWAGGER_PASS },
        }),
      );
    }
    const config = new DocumentBuilder()
      .setTitle('Sync API')
      .setDescription('API do aplicativo Sync')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs: /api/docs');
  } else {
    logger.log('Swagger desativado em produção (defina SWAGGER_USER/PASS para habilitar com basic auth)');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Sync API running on port ${port} (env=${process.env.NODE_ENV || 'dev'})`);
}

bootstrap();
