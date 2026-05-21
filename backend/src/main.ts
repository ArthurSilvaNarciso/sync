import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security headers (CSP relaxado pra suportar Swagger + APIs externas que usamos)
  app.use(
    helmet({
      contentSecurityPolicy: false, // tiles OSM + Unsplash precisam de imgs externas
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — em prod usa FRONTEND_URL; em dev aceita tudo
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  app.enableCors({
    origin: allowedOrigin === '*' ? true : [allowedOrigin, /\.vercel\.app$/],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
  });

  // Trust proxy (Railway, Heroku, etc. enviam X-Forwarded-Proto)
  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp?.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('Sync API')
    .setDescription('API do aplicativo Sync - plataforma social esportiva geolocalizada')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Sync API running on port ${port}`);
  logger.log(`Swagger docs: /api/docs`);
}

bootstrap();
