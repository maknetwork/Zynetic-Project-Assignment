import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const apiPrefix = process.env.API_PREFIX || '/v1';
  app.setGlobalPrefix(apiPrefix);

  app.enableCors();

  if (process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Fleet Telemetry Platform API')
      .setDescription(
        'High-scale telemetry ingestion and analytics system for Smart Meters and EV Fleets',
      )
      .setVersion('1.0')
      .addTag('Telemetry Ingestion', 'Endpoints for ingesting device telemetry')
      .addTag('Analytics', 'Endpoints for querying performance analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    logger.log(`Swagger documentation available at http://localhost:${process.env.PORT}/api`);
  }

  app.use('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}${apiPrefix}`);
  logger.log(`Environment: ${process.env.NODE_ENV}`);
}

bootstrap();
