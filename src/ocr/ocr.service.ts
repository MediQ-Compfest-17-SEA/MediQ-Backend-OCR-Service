import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { UserService } from './infrastructure/user.service';
import { QueueService } from './infrastructure/queue.service';

@Injectable()
export class OcrService {

    private readonly ocrApiUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly userService: UserService,
        private readonly queueService: QueueService,
    ) {
        this.ocrApiUrl = process.env.OCR_API_URL || 'http://localhost:8604';
    }

    async processImage(file: Express.Multer.File): Promise<any> {
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

    async confirmAndQueue(data: any, institutionId?: string): Promise<any> {
        const nikExists = await this.userService.checkNikExists(data.nik);

        let userId: string;
        if (!nikExists) {
            // Map OCR data to User Service format
            const userData = {
                nik: data.nik,
                name: data.nama,
                tempat_lahir: data.tempat_lahir,
                tgl_lahir: data.tgl_lahir,
                jenis_kelamin: data.jenis_kelamin,
                alamat_jalan: data.alamat?.name,
                alamat_kel_desa: data.alamat?.kel_desa,
                alamat_kecamatan: data.alamat?.kecamatan,
                alamat_rt_rw: data.alamat?.rt_rw,
                agama: data.agama,
                status_perkawinan: data.status_perkawinan,
                pekerjaan: data.pekerjaan,
                kewarganegaraan: data.kewarganegaraan,
                berlaku_hingga: data.berlaku_hingga,
            };
            const user = await this.userService.createUser(userData);
            userId = user.id;
        } else {
            const user = await this.userService.getUserByNik(data.nik);
            userId = user.id;
        }

        const queueData = {
            userId,
            institutionId: institutionId || null,
        };
        const queue = await this.queueService.addToQueue(queueData);

        return {
            success: true,
            message: 'Data berhasil diproses dan masuk ke antrian.',
            queue,
        };
    }
}
