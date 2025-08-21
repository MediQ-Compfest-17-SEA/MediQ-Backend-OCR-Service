import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { UserService } from './infrastructure/user.service';
import { QueueService } from './infrastructure/queue.service';

@Module({
    imports: [
        HttpModule,
        ClientsModule.register([
            {
                name: 'USER_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
                    queue: 'user_service_queue',
                    queueOptions: {
                        durable: true,
                    },
                },
            },
            {
                name: 'QUEUE_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
                    queue: 'queue_service_queue',
                    queueOptions: {
                        durable: true,
                    },
                },
            },
        ]),
    ],
    controllers: [OcrController],
    providers: [OcrService, UserService, QueueService],
})
export class OcrModule { }