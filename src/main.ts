import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';

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
    .setDescription('Advanced mikroservice untuk pemrosesan OCR KTP dengan integrasi Gemini AI OCR Engine, automatic queue management, dan real-time notifications. Bridge antara user upload dan ML processing.')
    .setVersion('3.0')
    .addTag('OCR', 'OCR processing endpoints - Upload KTP, konfirmasi hasil, integrasi dengan Queue Service')
    .addTag('health', 'Health check dan monitoring service - Status, dependency checks')
    .addBearerAuth()
    .setContact(
      'MediQ Support',
      'https://mediq.craftthingy.com',
      'support@mediq.com'
    )
    .setLicense(
      'MIT',
      'https://opensource.org/licenses/MIT'
    )
    .addServer(`http://localhost:${configService.get('PORT') || 8603}`, 'Development Server')
    .addServer('https://mediq-ocr-service.craftthingy.com', 'Production Server')
    .setExternalDoc('MediQ Documentation', 'https://mediq.craftthingy.com/docs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // gRPC microservice (internal)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'ocr.v1',
      protoPath: join(__dirname, '../shared/proto/ocr.proto'),
      url: process.env.OCR_GRPC_URL || '0.0.0.0:51053',
    },
  });

  await app.startAllMicroservices();
  const port = configService.get<number>('PORT') ?? 8603;
  await app.listen(port);

  console.log(`OCR service is listening on port ${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  console.log(`gRPC server listening at ${process.env.OCR_GRPC_URL || '0.0.0.0:51053'}`);
}
bootstrap();
