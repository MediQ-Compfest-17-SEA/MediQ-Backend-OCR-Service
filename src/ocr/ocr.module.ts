import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { OcrController } from './ocr.controller';
import { OcrGrpcController } from './ocr.grpc.controller';
import { OcrService } from './ocr.service';

@Module({
    imports: [
        HttpModule,
        // gRPC client for Queue Service (internal)
        ClientsModule.register([
            {
                name: 'QUEUE_GRPC',
                transport: Transport.GRPC,
                options: {
                    package: 'queue.v1',
                    protoPath: join(__dirname, '../../shared/proto/queue.proto'),
                    url: process.env.QUEUE_GRPC_URL || 'localhost:51055',
                },
            },
        ]),
    ],
    controllers: [OcrController, OcrGrpcController],
    providers: [OcrService],
})
export class OcrModule { }