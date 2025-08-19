import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';

@Module({
    imports: [HttpModule],
    controllers: [OcrController],
    providers: [OcrService],
})
export class OcrModule { }