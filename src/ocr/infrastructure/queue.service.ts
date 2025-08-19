import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport, RmqOptions } from '@nestjs/microservices';

@Injectable()
export class QueueService {
    private client: ClientProxy;

    constructor() {
        const rabbitUrl = process.env.RABBITMQ_URL;
        if (!rabbitUrl) {
            throw new Error('RABBITMQ_URL is not defined');
        }

        const options: RmqOptions = {
            transport: Transport.RMQ,
            options: {
                urls: [rabbitUrl],
                queue: 'ocr_service_queue',
                queueOptions: { durable: false },
            },
        };

        this.client = ClientProxyFactory.create(options);
    }

    async addToQueue(userId: string): Promise<any> {
        return this.client.emit('add_to_queue', { userId }).toPromise();
    }
}