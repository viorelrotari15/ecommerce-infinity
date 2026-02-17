import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { raw } from 'body-parser';
import { AppModule } from './app.module';
import { FileLogger } from './logs/file-logger';

async function bootstrap() {
  Logger.overrideLogger(new FileLogger());
  const app = await NestFactory.create(AppModule);

  // Stripe webhook needs raw body
  app.use('/api/payments/webhook', raw({ type: 'application/json' }));

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

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
