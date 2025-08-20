import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AlamatDto {
  @ApiProperty({
    description: 'Kelurahan/Desa dari alamat KTP',
    example: 'KELURAHAN MENTENG',
  })
  @IsString()
  @IsNotEmpty()
  kel_desa: string;

  @ApiProperty({
    description: 'Kecamatan dari alamat KTP',
    example: 'MENTENG',
  })
  @IsString()
  @IsNotEmpty()
  kecamatan: string;

  @ApiProperty({
    description: 'Nama jalan/alamat lengkap',
    example: 'JL. MENTENG RAYA NO. 123',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'RT/RW',
    example: '001/002',
  })
  @IsString()
  @IsNotEmpty()
  rt_rw: string;
}

export class OcrDataDto {
  @ApiProperty({
    description: 'Nomor Induk Kependudukan (NIK)',
    example: '3171012345678901',
    minLength: 16,
    maxLength: 16,
  })
  @IsString()
  @IsNotEmpty()
  nik: string;

  @ApiProperty({
    description: 'Nama lengkap sesuai KTP',
    example: 'JOHN DOE SMITH',
  })
  @IsString()
  @IsNotEmpty()
  nama: string;

  @ApiProperty({
    description: 'Tempat lahir',
    example: 'JAKARTA',
  })
  @IsString()
  @IsNotEmpty()
  tempat_lahir: string;

  @ApiProperty({
    description: 'Tanggal lahir dalam format DD-MM-YYYY',
    example: '15-08-1990',
  })
  @IsString()
  @IsNotEmpty()
  tgl_lahir: string;

  @ApiProperty({
    description: 'Jenis kelamin',
    example: 'LAKI-LAKI',
    enum: ['LAKI-LAKI', 'PEREMPUAN'],
  })
  @IsString()
  @IsNotEmpty()
  jenis_kelamin: string;

  @ApiProperty({
    description: 'Alamat lengkap dari KTP',
    type: AlamatDto,
  })
  @ValidateNested()
  @Type(() => AlamatDto)
  alamat: AlamatDto;

  @ApiProperty({
    description: 'Agama',
    example: 'ISLAM',
  })
  @IsString()
  @IsNotEmpty()
  agama: string;

  @ApiProperty({
    description: 'Status perkawinan',
    example: 'BELUM KAWIN',
    enum: ['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI'],
  })
  @IsString()
  @IsNotEmpty()
  status_perkawinan: string;

  @ApiProperty({
    description: 'Pekerjaan',
    example: 'KARYAWAN SWASTA',
  })
  @IsString()
  @IsNotEmpty()
  pekerjaan: string;

  @ApiProperty({
    description: 'Kewarganegaraan',
    example: 'WNI',
    enum: ['WNI', 'WNA'],
  })
  @IsString()
  @IsNotEmpty()
  kewarganegaraan: string;

  @ApiProperty({
    description: 'Masa berlaku KTP',
    example: 'SEUMUR HIDUP',
  })
  @IsString()
  @IsNotEmpty()
  berlaku_hingga: string;
}

export class OcrUploadResponseDto {
  @ApiProperty({
    description: 'Status keberhasilan operasi',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Pesan response',
    example: 'KTP scanned successfully. Please verify and edit the data.',
  })
  message: string;

  @ApiProperty({
    description: 'Data hasil OCR KTP',
    type: OcrDataDto,
  })
  data: OcrDataDto;
}

export class OcrConfirmResponseDto {
  @ApiProperty({
    description: 'Status keberhasilan operasi',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Pesan response',
    example: 'Data confirmed and added to patient queue successfully',
  })
  message: string;

  @ApiProperty({
    description: 'ID antrian pasien',
    example: 'PQ-20240120-001',
  })
  queueId: string;
}