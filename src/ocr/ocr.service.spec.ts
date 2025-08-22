import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from './ocr.service';
import { HttpService } from '@nestjs/axios';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';

const mockHttpService = {
  post: jest.fn(),
};

const mockUserServiceClient = {
  send: jest.fn(),
};

const mockQueueServiceClient = {
  emit: jest.fn(),
};

describe('OcrService', () => {
  let service: OcrService;
  let httpService: HttpService;
  let userServiceClient: ClientProxy;
  let queueServiceClient: ClientProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: 'USER_SERVICE', 
          useValue: mockUserServiceClient,
        },
        {
          provide: 'QUEUE_SERVICE',
          useValue: mockQueueServiceClient,
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    httpService = module.get<HttpService>(HttpService);
    userServiceClient = module.get<ClientProxy>('USER_SERVICE');
    queueServiceClient = module.get<ClientProxy>('QUEUE_SERVICE');

    // Reset semua mock sebelum setiap tes
    jest.clearAllMocks();
  });

  // =============================================
  // Test Cases
  // =============================================

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processKtp', () => {
    it('should process an image and return extracted data', async () => {
      const mockFile = { buffer: Buffer.from('fake-image') } as Express.Multer.File;
      const mockOcrResult = { data: { nik: '123456', nama: 'Test' } };

      mockHttpService.post.mockReturnValue(of(mockOcrResult));
      const result = await service.processImage(mockFile);

      expect(httpService.post).toHaveBeenCalled();
      expect(result).toEqual(mockOcrResult.data);
    });

    it('should throw an error if OCR engine fails', async () => {
      const mockFile = { buffer: Buffer.from('fake-image') } as Express.Multer.File;
      mockHttpService.post.mockReturnValue(throwError(() => new Error('OCR Engine Error')));
      await expect(service.processImage(mockFile)).rejects.toThrow('OCR Engine Error');
    });
  });

  describe('confirmOcrData', () => {
    it('should create a new user and add to queue if NIK does not exist', async () => {
      const ocrData = { nik: '123456', name: 'New User' };
      const createdUser = { id: 'user-1', ...ocrData };

      mockUserServiceClient.send
        .mockReturnValueOnce(of(false)) // user.check-nik-exists
        .mockReturnValueOnce(of(createdUser)); // user.create-from-ocr

      await service.confirmAndQueue(ocrData);

      expect(mockUserServiceClient.send).toHaveBeenCalledWith('user.create-from-ocr', ocrData);
      expect(mockQueueServiceClient.emit).toHaveBeenCalledWith('add_to_queue', { userId: createdUser.id });
    });
  });
});