import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { OcrDataDto } from './ocr-data.dto';

export class ConfirmQueueDto {
  @ApiProperty({
    description: 'Data KTP hasil OCR yang telah diverifikasi',
    type: OcrDataDto,
  })
  @ValidateNested()
  @Type(() => OcrDataDto)
  data: OcrDataDto;

  @ApiPropertyOptional({
    description: 'ID institusi kesehatan untuk pendaftaran antrian',
    example: 'inst-uuid-1234-5678',
  })
  @IsString()
  @IsOptional()
  institutionId?: string;
}
