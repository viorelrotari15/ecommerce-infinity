import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { raw } from 'body-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { FileLogger } from './logs/file-logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  Logger.overrideLogger(new FileLogger());
  const app = await NestFactory.create(AppModule);

  // Security: Helmet sets secure HTTP headers (XSS, clickjacking, MIME sniffing, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false, // allow e.g. Stripe iframes if needed
    }),
  );

  // Stripe webhook needs raw body
  app.use('/api/payments/webhook', raw({ type: 'application/json' }));

  // Don't advertise server
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // CORS: restrict origin, methods, and headers
  const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Accept-Language'],
  });

  // Security: don't leak stack traces or internal errors in production
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix (exclude Prometheus metrics endpoint)
  app.setGlobalPrefix('api', {
    exclude: ['metrics'],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('E-commerce API')
    .setDescription('E-commerce platform API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
