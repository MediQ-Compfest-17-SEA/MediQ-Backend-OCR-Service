import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('MediQ OCR Service API')
    .setDescription('API for processing Indonesian KTP (e-KTP) using OCR technology')
    .setVersion('1.0')
    .addTag('OCR', 'OCR processing endpoints')
    .addServer(`http://localhost:${configService.get('PORT') || 3002}`, 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const rabbitUrl = configService.get<string>('RABBITMQ_URL');
  if (!rabbitUrl) {
    throw new Error('RABBITMQ_URL is not defined in configuration');
  }

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue: 'ocr_service_queue',
      queueOptions: { durable: false },
    },
  });

  await app.startAllMicroservices();
  const port = configService.get<number>('PORT') ?? 3002;
  await app.listen(port);

  console.log(`OCR service is listening on port ${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  console.log(`Microservice is listening for RabbitMQ messages`);
}
bootstrap();
