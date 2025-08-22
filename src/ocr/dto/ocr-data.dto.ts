import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, ValidateNested, IsOptional } from 'class-validator';
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
    description: 'Temporary OCR data payload with tempId',
    // avoid forward-ref in metadata; declare as object schema here for swagger
    type: Object,
  })
  data: any;
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

export class OcrTempDataDto {
  @ApiProperty({ description: 'Temporary ID for OCR session', example: 'TMP-MB4ZK4-1A2B3C' })
  tempId: string;

  @ApiProperty({ description: 'Current temporary OCR data', type: OcrDataDto })
  data?: OcrDataDto;
}

export class OcrConfirmTempResponseDto extends OcrConfirmResponseDto {
  @ApiProperty({ description: 'Temporary tempId deleted after confirm', example: 'TMP-MB4ZK4-1A2B3C' })
  tempIdDeleted: string;
}

export class UserDataDto {
  @ApiProperty({ description: 'Email pengguna', example: 'user@example.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Nomor handphone', example: '+6281234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Username', example: 'john.doe', required: false })
  @IsOptional()
  @IsString()
  username?: string;
}

export class InstitutionDataDto {
  @ApiProperty({ description: 'ID Institusi', example: 'INST-123', required: false })
  @IsOptional()
  @IsString()
  institutionId?: string;

  @ApiProperty({ description: 'Nama Institusi', example: 'RS Harapan Bunda', required: false })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiProperty({ description: 'Departemen/Poli', example: 'Poli Umum', required: false })
  @IsOptional()
  @IsString()
  departmentName?: string;

  @ApiProperty({ description: 'Jenis layanan', example: 'konsultasi', required: false })
  @IsOptional()
  @IsString()
  serviceType?: string;
}

export class TempPatchDto {
  @ApiProperty({ description: 'Patch data KTP hasil OCR', required: false, type: OcrDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OcrDataDto)
  ktp?: OcrDataDto;

  @ApiProperty({ description: 'Data user untuk registrasi', required: false, type: UserDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserDataDto)
  user?: UserDataDto;

  @ApiProperty({ description: 'Data institusi untuk queue', required: false, type: InstitutionDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InstitutionDataDto)
  institution?: InstitutionDataDto;
}