import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { OcrService } from './ocr.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import {
  OcrDataDto,
  OcrUploadResponseDto,
  OcrConfirmResponseDto,
} from './dto/ocr-data.dto';
import { ConfirmQueueDto } from './dto/confirm-queue.dto';

@ApiTags('OCR')
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload KTP image for OCR processing',
    description:
      'Upload an image file (JPG, PNG, etc.) containing Indonesian KTP (e-KTP) to extract text data using OCR technology. The extracted data can then be verified and edited before confirmation.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'KTP image file to be processed',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file containing KTP (JPG, PNG, etc.)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'KTP successfully processed and data extracted',
    type: OcrUploadResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'No file uploaded or invalid file format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'No file uploaded' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'OCR processing failed or external service error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Failed to scan KTP' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<OcrUploadResponseDto> {
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
  @ApiOperation({
    summary: 'Confirm OCR data and add to patient queue with institution support',
    description:
      'Konfirmasi data KTP hasil OCR dan otomatis daftarkan ke antrian. Endpoint ini akan membuat user baru (jika NIK belum ada) dengan data KTP lengkap, kemudian mendaftarkan ke antrian dengan support institution ID.',
  })
  @ApiBody({
    description: 'Data KTP yang telah dikonfirmasi dengan optional institution ID',
    type: ConfirmQueueDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Data confirmed and successfully added to patient queue',
    type: OcrConfirmResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid data format or missing required fields',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['nik should not be empty', 'nama should not be empty'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to add patient to queue or database error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Failed to add patient to queue',
        },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async confirmData(@Body() payload: ConfirmQueueDto): Promise<OcrConfirmResponseDto> {
    return await this.ocrService.confirmAndQueue(payload.data, payload.institutionId);
  }
}
