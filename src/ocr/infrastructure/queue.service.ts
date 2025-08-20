import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class QueueService {
    constructor(@Inject('QUEUE_SERVICE') private readonly queueClient: ClientProxy) { }

    async addToQueue(userId: string): Promise<any> {
        return firstValueFrom(
            this.queueClient.send('queue.add-to-queue', { userId })
        );
    }
}