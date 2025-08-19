import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class OcrService {

    private readonly ocrApiUrl: string;

    constructor(private readonly httpService: HttpService) {
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

    async checkNikExists(nik: string): Promise<boolean> {
        const userServiceUrl = process.env.USER_SERVICE_URL;
        const response = await firstValueFrom(
            this.httpService.get(`${userServiceUrl}/users/check-nik`, { params: { nik } })
        );
        return response.data.exists;
    }

    async confirmAndQueue(data: any): Promise<any> {
        const userServiceUrl = process.env.USER_SERVICE_URL;
        const queueServiceUrl = process.env.QUEUE_SERVICE_URL;

        const nikExists = await this.checkNikExists(data.nik);

        let userId: string;
        if (!nikExists) {
            const createUserResponse = await firstValueFrom(
                this.httpService.post(`${userServiceUrl}/users`, data)
            );
            userId = createUserResponse.data.id;
        } else {
            const getUserResponse = await firstValueFrom(
                this.httpService.get(`${userServiceUrl}/users/by-nik`, { params: { nik: data.nik } })
            );
            userId = getUserResponse.data.id;
        }

        const queueResponse = await firstValueFrom(
            this.httpService.post(`${queueServiceUrl}/queue`, { userId })
        );

        return {
            success: true,
            message: 'Data berhasil diproses dan masuk ke antrian.',
            queue: queueResponse.data,
        };
    }
}
