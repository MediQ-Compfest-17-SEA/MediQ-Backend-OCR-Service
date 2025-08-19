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
}
