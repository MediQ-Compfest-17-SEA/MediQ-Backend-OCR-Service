import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { UserService } from './infrastructure/user.service';
import { QueueService } from './infrastructure/queue.service';

@Injectable()
export class OcrService {

    private readonly ocrApiUrl: string;
    private readonly userService: UserService;
    private readonly queueService: QueueService;

    constructor(
        private readonly httpService: HttpService,
        userService: UserService,
        queueService: QueueService,
    ) {
        this.userService = userService;
        this.queueService = queueService;

        if (!process.env.OCR_API_URL) {
            throw new Error('OCR_API_URL environment variable is not set');
        }
        this.ocrApiUrl = process.env.OCR_API_URL;
    }

    async processImage(file: Express.Multer.File): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('image', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });

            const response = await firstValueFrom(
                this.httpService.post(this.ocrApiUrl, formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },
                })
            );

            return response.data;
        } catch (error) {
            throw new Error(`Failed to process image: ${error.message}`);
        }
    }

    async confirmAndQueue(data: any): Promise<any> {
        const nikExists = await this.userService.checkNikExists(data.nik);

        let userId: string;
        if (!nikExists) {
            const user = await this.userService.createUser(data);
            userId = user.id;
        } else {
            const user = await this.userService.getUserByNik(data.nik);
            userId = user.id;
        }

        const queue = await this.queueService.addToQueue(userId);

        return {
            success: true,
            message: 'Data berhasil diproses dan masuk ke antrian.',
            queue,
        };
    }
}
