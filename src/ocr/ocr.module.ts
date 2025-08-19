import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { UserService } from './infrastructure/user.service';
import { QueueService } from './infrastructure/queue.service';

@Module({
    imports: [HttpModule],
    controllers: [OcrController],
    providers: [OcrService, UserService, QueueService],
})
export class OcrModule { }