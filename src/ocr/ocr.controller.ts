import { Body, Controller, HttpException, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('ocr')
export class OcrController {

    constructor(private readonly ocrService: OcrService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<any> {
        if (!file) {
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.ocrService.processImage(file);
            return {
                success: true,
                message: 'KTP scanned successfully. Please verify and edit the data.',
                data: result,
            };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to scan KTP',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('confirm')
    async confirmData(@Body() data: any) {
        return await this.ocrService.confirmAndQueue(data);
    }
}
