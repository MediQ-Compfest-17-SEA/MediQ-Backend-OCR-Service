import { Test, TestingModule } from '@nestjs/testing';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { ConfirmQueueDto } from './dto/confirm-queue.dto';

const mockOcrService = {
  processImage: jest.fn(),
  createTempRecord: jest.fn(),
  confirmAndQueue: jest.fn(),
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
    it('should call OcrService.processImage and return tempId payload', async () => {
      const mockFile = {
        originalname: 'ktp.jpg',
        buffer: Buffer.from('img'),
        mimetype: 'image/jpeg',
      } as unknown as Express.Multer.File;

      const ocrResult = { nik: '123', nama: 'Test' };
      (mockOcrService.processImage as jest.Mock).mockResolvedValue(ocrResult);
      (mockOcrService.createTempRecord as jest.Mock).mockReturnValue({ tempId: 'TMP-123', data: ocrResult });

      const result = await controller.uploadFile(mockFile);

      expect(mockOcrService.processImage).toHaveBeenCalledWith(mockFile);
      expect(mockOcrService.createTempRecord).toHaveBeenCalledWith(ocrResult);
      expect(result.success).toBe(true);
      expect(result.data.tempId).toBe('TMP-123');
    });

    it('should throw 400 HttpException if no file is uploaded', async () => {
      await expect(controller.uploadFile(undefined as any)).rejects.toThrow('No file uploaded');
    });
  });

  describe('confirm', () => {
    it('should call OcrService.confirmAndQueue with provided data and institutionId', async () => {
      const payload: ConfirmQueueDto = {
        data: {
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
        },
        institutionId: 'inst-1',
      };

      const serviceResult = { success: true, queue: { id: 'q1' } };
      (mockOcrService.confirmAndQueue as jest.Mock).mockResolvedValue(serviceResult);

      const result = await controller.confirmData(payload);

      expect(mockOcrService.confirmAndQueue).toHaveBeenCalledWith(payload.data, payload.institutionId);
      expect(result).toEqual(serviceResult);
    });
  });
});
// Edge-case tests appended

describe('OcrController edge cases', () => {
  let controller: OcrController;

  const mockOcrServiceEdge = {
    processImage: jest.fn(),
    createTempRecord: jest.fn(),
    confirmAndQueue: jest.fn(),
    getTempRecord: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcrController],
      providers: [
        {
          provide: OcrService,
          useValue: mockOcrServiceEdge,
        },
      ],
    }).compile();

    controller = module.get<OcrController>(OcrController);
    jest.clearAllMocks();
  });

  it('uploadFile maps upstream OCR engine error to correct HTTP status and message', async () => {
    const mockFile = {
      originalname: 'bad.jpg',
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
    } as unknown as Express.Multer.File;

    (mockOcrServiceEdge.processImage as jest.Mock).mockRejectedValue(
      new Error('Upstream OCR engine error: status=422, body={"code":"INVALID_IMAGE"}'),
    );

    try {
      await controller.uploadFile(mockFile);
      fail('should have thrown');
    } catch (e: any) {
      // HttpException with mapped status and upstream payload
      expect(typeof e.getStatus).toBe('function');
      expect(e.getStatus()).toBe(422);
      const res = e.getResponse();
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/OCR engine returned an error/);
      // upstream normalized should include parsed body with code
      expect(typeof res.upstream).toBe('object');
      expect(res.upstream.code).toBe('INVALID_IMAGE');
    }
  });

  it('getTemp should throw 404 when temp data not found', async () => {
    (mockOcrServiceEdge.getTempRecord as jest.Mock).mockReturnValue(null);

    try {
      await controller.getTemp('NOT-EXIST');
      fail('should have thrown');
    } catch (e: any) {
      expect(e.getStatus()).toBe(404);
      const body = e.getResponse();
      expect(body).toBe('Temporary data not found');
    }
  });
});