import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Get,
  Patch,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
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
  OcrTempDataDto,
  OcrConfirmTempResponseDto,
} from './dto/ocr-data.dto';
import { ConfirmQueueDto } from './dto/confirm-queue.dto';
import { TempPatchDto } from './dto/ocr-data.dto';

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
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.ocrService.processImage(file);
      const { tempId } = this.ocrService.createTempRecord(result);
      return {
        success: true,
        message: 'KTP scanned successfully. Temporary data created. Use tempId to GET/PATCH before confirm.',
        data: { tempId },
      };
    } catch (error: any) {
      // Normalize upstream errors to client-friendly response (avoid generic 500)
      const rawMsg = String(error?.message || '');
      // Attempt to extract engine status/body if we bubbled it
      // Example: "Upstream OCR engine error: status=400, body={...}"
      let normalizedDetail: any = rawMsg;
      const match = rawMsg.match(/Upstream OCR engine error: status=(\d+), body=(.+)$/);
      if (match) {
        const statusFromEngine = parseInt(match[1], 10) || 400;
        try {
          const parsed = JSON.parse(match[2]);
          normalizedDetail = parsed;
        } catch {
          normalizedDetail = match[2];
        }
        throw new HttpException(
          {
            success: false,
            message: 'OCR engine returned an error while processing image',
            upstream: normalizedDetail,
          },
          statusFromEngine >= 400 && statusFromEngine < 600 ? statusFromEngine : HttpStatus.BAD_REQUEST,
        );
      }

      // Fallback: treat as bad request rather than opaque 500
      throw new HttpException(
        {
          success: false,
          message: 'Failed to scan KTP',
          upstream: normalizedDetail,
        },
        HttpStatus.BAD_REQUEST,
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
    try {
      return await this.ocrService.confirmAndQueue(payload.data, payload.institutionId);
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to confirm OCR data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('temp/:tempId')
  @ApiOperation({ summary: 'Get temporary OCR data by tempId' })
  @ApiResponse({ status: 200, description: 'Temporary data found', type: OcrTempDataDto })
  @ApiResponse({ status: 404, description: 'Temporary data not found' })
  async getTemp(@Param('tempId') tempId: string) {
    const data = this.ocrService.getTempRecord(tempId);
    if (!data) {
      throw new HttpException('Temporary data not found', HttpStatus.NOT_FOUND);
    }
    return { tempId, data } as OcrTempDataDto;
  }

  @Patch('temp/:tempId')
  @ApiOperation({ summary: 'Patch temporary OCR data (name, email, etc.)' })
  @ApiBody({
    description: 'Patch payload untuk data KTP, data user, dan data institusi',
    type: TempPatchDto
  })
  @ApiResponse({ status: 200, description: 'Temporary data updated' })
  @ApiResponse({ status: 404, description: 'Temporary data not found' })
  async patchTemp(@Param('tempId') tempId: string, @Body() patch: TempPatchDto) {
    const updated = this.ocrService.patchTempRecord(tempId, patch);
    if (!updated) {
      throw new HttpException('Temporary data not found', HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  @Post('confirm-temp/:tempId')
  @ApiOperation({ summary: 'Confirm temporary data by tempId and add to patient queue' })
  @ApiBody({
    description: 'Optional institutionId in body',
    schema: { type: 'object', properties: { institutionId: { type: 'string' } } }
  })
  @ApiResponse({ status: 200, description: 'Confirmed and queued; temp deleted', type: OcrConfirmTempResponseDto })
  async confirmFromTemp(@Param('tempId') tempId: string, @Body() body: any) {
    try {
      const result = await this.ocrService.confirmFromTemp(tempId, body?.institutionId);
      return result;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Failed to confirm from temp',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
