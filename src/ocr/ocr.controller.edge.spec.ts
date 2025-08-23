import { Test, TestingModule } from '@nestjs/testing';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';

describe('OcrController additional edge cases', () => {
  let controller: OcrController;

  const mockOcrService = {
    processImage: jest.fn(),
    createTempRecord: jest.fn(),
    confirmAndQueue: jest.fn(),
    getTempRecord: jest.fn(),
    patchTempRecord: jest.fn(),
    confirmFromTemp: jest.fn(),
  };

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

  it('getTemp success path returns temp data', async () => {
    const data = { nik: '123', nama: 'X' };
    (mockOcrService.getTempRecord as jest.Mock).mockReturnValue(data);

    const result = await controller.getTemp('TMP-1');
    expect(result).toEqual({ tempId: 'TMP-1', data });
  });

  it('patchTemp success returns updated object', async () => {
    const updated = { tempId: 'TMP-2', data: { nama: 'Y' } };
    (mockOcrService.patchTempRecord as jest.Mock).mockReturnValue(updated);

    const result = await controller.patchTemp('TMP-2', { ktp: { nama: 'Y' } } as any);
    expect(result).toEqual(updated);
    expect(mockOcrService.patchTempRecord).toHaveBeenCalledWith('TMP-2', { ktp: { nama: 'Y' } });
  });

  it('patchTemp returns 404 when service returns null', async () => {
    (mockOcrService.patchTempRecord as jest.Mock).mockReturnValue(null);

    await expect(controller.patchTemp('NOT-FOUND', {} as any)).rejects.toThrow(/Temporary data not found/);
  });

  it('confirmData propagates service error as 500', async () => {
    (mockOcrService.confirmAndQueue as jest.Mock).mockRejectedValue(new Error('boom'));

    try {
      await controller.confirmData({ data: {} as any } as any);
      fail('should throw');
    } catch (e: any) {
      expect(e.getStatus()).toBe(500);
      expect(String(e.message)).toMatch(/Failed to confirm OCR data|boom/);
    }
  });

  it('confirmFromTemp success returns service payload', async () => {
    const payload = { success: true, tempIdDeleted: 'TMP-3' };
    (mockOcrService.confirmFromTemp as jest.Mock).mockResolvedValue(payload);

    const result = await controller.confirmFromTemp('TMP-3', { institutionId: 'inst-1' });
    expect(result).toEqual(payload);
    expect(mockOcrService.confirmFromTemp).toHaveBeenCalledWith('TMP-3', 'inst-1');
  });

  it('confirmFromTemp propagates failure as 500', async () => {
    (mockOcrService.confirmFromTemp as jest.Mock).mockRejectedValue(new Error('bad'));

    try {
      await controller.confirmFromTemp('TMP-4', { institutionId: 'inst-1' });
      fail('should throw');
    } catch (e: any) {
      expect(e.getStatus()).toBe(500);
      expect(String(e.message)).toMatch(/Failed to confirm from temp|bad/);
    }
  });
});