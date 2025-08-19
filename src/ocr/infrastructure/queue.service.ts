import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class QueueService {
    constructor(private readonly httpService: HttpService) { }

    async addToQueue(userId: string): Promise<any> {
        const queueServiceUrl = process.env.QUEUE_SERVICE_URL;
        const response = await firstValueFrom(
            this.httpService.post(`${queueServiceUrl}/queue`, { userId })
        );
        return response.data;
    }
}