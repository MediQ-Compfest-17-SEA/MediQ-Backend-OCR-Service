import { Test, TestingModule } from '@nestjs/testing';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { BadRequestException } from '@nestjs/common';
import { OcrDataDto } from './dto/ocr-data.dto';
import { ConfirmQueueDto } from './dto/confirm-queue.dto'

const mockOcrService = {
  processKtp: jest.fn(),
  confirmOcrData: jest.fn(),
};

describe('OcrController', () => {
  let controller: OcrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcrController],
      providers: [
        {
          provide: OcrService,
          useValue: mockOcrService,
        },
      ],
    }).compile();

    controller = module.get<OcrController>(OcrController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should call OcrService.processKtp with the uploaded file', async () => {
      const mockFile = { originalname: 'ktp.jpg' } as Express.Multer.File;
      const expectedResult = { nik: '123', nama: 'Test' };
      
      mockOcrService.processKtp.mockResolvedValue(expectedResult);
      const result = await controller.uploadFile(mockFile);

      expect(mockOcrService.processKtp).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException if no file is uploaded', async () => {
      await expect(controller.uploadFile).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirm', () => {
    it('should call OcrService.confirmOcrData with the provided data', async () => {
      const mockOcrData: OcrDataDto = {
        nik: '1234567890123456',
        nama: 'Nama Lengkap Tes',
        tempat_lahir: 'Jakarta',
        tgl_lahir: '01-01-1990',
        jenis_kelamin: 'LAKI-LAKI',
        alamat: {
            name: 'Jl. Uji Coba No. 1',
            rt_rw: '001/002',
            kel_desa: 'Kelurahan Tes',
            kecamatan: 'Kecamatan Tes',
        },
        agama: 'ISLAM',
        status_perkawinan: 'KAWIN',
        pekerjaan: 'PENGUJI PERANGKAT LUNAK',
        kewarganegaraan: 'WNI',
        berlaku_hingga: 'SEUMUR HIDUP',
      };
      
      const confirmDto: ConfirmQueueDto = { data: mockOcrData };
      
      mockOcrService.confirmOcrData.mockResolvedValue({ status: 'success' });

      const result = await controller.confirmData(confirmDto);
      
      expect(mockOcrService.confirmOcrData).toHaveBeenCalledWith(confirmDto.data);
      expect(result).toEqual({ status: 'success' });
    });
  });
});