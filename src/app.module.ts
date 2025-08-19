import { Module } from '@nestjs/common';
import { OcrService } from './ocr/ocr.service';
import { OcrController } from './ocr/ocr.controller';
import { OcrModule } from './ocr/ocr.module';

@Module({
  imports: [OcrModule],
  controllers: [OcrController],
  providers: [OcrService],
})
export class AppModule { }
