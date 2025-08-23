import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from './ocr.service';
import { HttpService } from '@nestjs/axios';
import type { ClientGrpc } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';

describe('OcrService', () => {
  let service: OcrService;
  let httpService: jest.Mocked<HttpService>;
  let mockClientGrpc: { getService: jest.Mock };

  beforeEach(async () => {
    const httpMock: Partial<HttpService> = {
      post: jest.fn(),
      get: jest.fn(),
    };
    mockClientGrpc = {
      getService: jest.fn().mockReturnValue({
        AddToQueue: jest.fn().mockReturnValue(of({ success: true, dataJson: JSON.stringify({ id: 'q1' }) })),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: HttpService,
          useValue: httpMock,
        },
        {
          provide: 'QUEUE_GRPC',
          useValue: mockClientGrpc as unknown as ClientGrpc,
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;

    jest.clearAllMocks();

    // Initialize gRPC service binding
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processImage()', () => {
    it('should process an image and return extracted data', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
      } as unknown as Express.Multer.File;

      const mockData = { nik: '1234567890123456', nama: 'Test' };

      httpService.post.mockReturnValue(
        of({
          status: 200,
          data: mockData,
        } as any),
      );

      const result = await service.processImage(mockFile);

      expect(httpService.post).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('should wrap upstream error into a descriptive failure', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
      } as unknown as Express.Multer.File;

      httpService.post.mockReturnValue(throwError(() => new Error('OCR Engine Error')));

      await expect(service.processImage(mockFile)).rejects.toThrow(/Failed to process image/);
    });
  });

  describe('confirmAndQueue()', () => {
    it('should upsert user (HTTP), add to queue (gRPC), and login (HTTP)', async () => {
      const data = {
        nik: '1234567890123456',
        nama: 'John Doe',
        tempat_lahir: 'Jakarta',
        tgl_lahir: '2000-01-01',
        jenis_kelamin: 'L',
        alamat: { name: 'Jl. Mawar', rt_rw: '01/02', kel_desa: 'Melati', kecamatan: 'Kebayoran' },
        agama: 'Islam',
      };

      // 1) Check NIK: 404 to trigger create
      (httpService.get as jest.Mock).mockReturnValue(of({ status: 404 }));

      // 2) Create user
      (httpService.post as jest.Mock).mockReturnValueOnce(of({ status: 201, data: { id: 'user-1' } }));

      // queue AddToQueue already mocked in ClientGrpc.getService()

      // 3) Login (second post call)
      (httpService.post as jest.Mock).mockReturnValueOnce(of({ status: 200, data: { access_token: 'at', refresh_token: 'rt' } }));

      const result = await service.confirmAndQueue(data, 'inst-1');

      expect(result.success).toBe(true);
      expect(result.queue).toMatchObject({ id: 'q1' });
      expect(result.tokens).toMatchObject({ access_token: 'at' });

      // Ensure the gRPC service was resolved and invoked
      expect(mockClientGrpc.getService).toHaveBeenCalledWith('QueueService');
    });
  });
});
describe('OcrService - temp store and normalization', () => {
let service: OcrService;
  let httpService: jest.Mocked<HttpService>;
  let mockClientGrpc: { getService: jest.Mock };

  beforeEach(async () => {
    const httpMock: Partial<HttpService> = {
      post: jest.fn(),
      get: jest.fn(),
    };
    mockClientGrpc = {
      getService: jest.fn().mockReturnValue({
        AddToQueue: jest.fn().mockReturnValue(of({ success: true, dataJson: JSON.stringify({ id: 'q1' }) })),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: HttpService,
          useValue: httpMock,
        },
        {
          provide: 'QUEUE_GRPC',
          useValue: mockClientGrpc as unknown as ClientGrpc,
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;

    jest.clearAllMocks();

    // Initialize gRPC service binding
    service.onModuleInit();
  });
  it('createTempRecord flattens nested result and getTempRecord retrieves normalized data', () => {
    const nested = {
      result: {
        nik: '1234567890123456',
        nama: 'Jane Doe',
        alamat: { name: 'Jl. Melati', rt_rw: '001/002', kel_desa: 'X', kecamatan: 'Y' },
        agama: 'ISLAM',
      },
      rawOther: true,
    };
    const { tempId, data } = service.createTempRecord(nested);
    expect(tempId).toMatch(/^TMP\-/);
    expect(data.nik).toBe('1234567890123456');
    expect(data.nama).toBe('Jane Doe');
    const fetched = service.getTempRecord(tempId);
    expect(fetched.nik).toBe('1234567890123456');
    expect(fetched._raw).toBeDefined();
  });

  it('getTempRecord converts legacy raw entry shape into normalized container', () => {
    const legacyTempId = 'TMP-LEGACY-1';
    const legacyRaw = { result: { nik: '1234567890123456', nama: 'Legacy User' } };
    (service as any).tempStore.set(legacyTempId, legacyRaw); // simulate wrongly stored entry
    const fixed = service.getTempRecord(legacyTempId);
    expect(fixed.nik).toBe('1234567890123456');
    // should now be persisted back as proper { data, createdAt }
    const container = (service as any).tempStore.get(legacyTempId);
    expect(container.data).toBeDefined();
    expect(container.createdAt).toBeDefined();
  });

  it('getTempRecord returns null when entry is expired', () => {
    const oldId = 'TMP-OLD';
    (service as any).tempStore.set(oldId, {
      data: { nik: '1234567890123456', nama: 'Old' },
      createdAt: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago, beyond ttl
    });
    expect(service.getTempRecord(oldId)).toBeNull();
  });

  it('patchTempRecord returns null when temp not found', () => {
    const res = service.patchTempRecord('NOT-EXISTS', { ktp: { nama: 'X' } } as any);
    expect(res).toBeNull();
  });

  it('patchTempRecord throws for invalid NIK format', () => {
    const base = { result: { nik: '1234567890123456', nama: 'Base User' } };
    const { tempId } = service.createTempRecord(base);
    expect(() =>
      service.patchTempRecord(tempId, { ktp: { nik: '123' } } as any),
    ).toThrow(/Format NIK tidak valid/);
  });

  it('patchTempRecord throws when NIK distance too far from OCR', () => {
    const base = { result: { nik: '1234567890123456', nama: 'Base User' } };
    const { tempId } = service.createTempRecord(base);
    // change 4 digits to exceed allowed distance of 2
    const farNik = '9999567890123456';
    expect(() =>
      service.patchTempRecord(tempId, { ktp: { nik: farNik } } as any),
    ).toThrow(/Perbedaan NIK terlalu jauh/);
  });

  it('patchTempRecord throws when nama distance too far from OCR', () => {
    const base = { result: { nik: '1234567890123456', nama: 'JOHNDOE' } };
    const { tempId } = service.createTempRecord(base);
    expect(() =>
      service.patchTempRecord(tempId, { ktp: { nama: 'ZZZZZZZZZZ' } } as any),
    ).toThrow(/Perbedaan nama terlalu jauh/);
  });
 
 describe('OcrService - helper methods and fallbacks', () => {
   it('isValidNik returns true for 16 digits and false otherwise', () => {
     const isValidNik = (service as any).isValidNik.bind(service);
     expect(isValidNik('1234567890123456')).toBe(true);
     expect(isValidNik('123')).toBe(false);
     expect(isValidNik(undefined)).toBe(false);
   });
 
   it('hammingDistance counts differing positions and MAX_SAFE_INTEGER for unequal length', () => {
     const hamming = (service as any).hammingDistance.bind(service);
     expect(hamming('ABC', 'ABC')).toBe(0);
     expect(hamming('ABC', 'AXC')).toBe(1);
     expect(hamming('ABCD', 'ABC')).toBe(Number.MAX_SAFE_INTEGER);
   });
 
   it('levenshtein computes edit distance correctly for small strings', () => {
     const lev = (service as any).levenshtein.bind(service);
     expect(lev('kitten', 'sitting')).toBe(3);
     expect(lev('abc', 'abc')).toBe(0);
     expect(lev('abc', 'ab')).toBe(1);
   });
 
   it('getTempRecord normalizes when entry.data.result exists without top-level nik', () => {
     const tempId = 'TMP-NORM-1';
     const container = {
       data: { result: { nik: '1234567890123456', nama: 'Norm' } },
       createdAt: Date.now(),
     };
     (service as any).tempStore.set(tempId, container);
     const res = service.getTempRecord(tempId);
     expect(res.nik).toBe('1234567890123456');
     // ensure container was rewritten to normalized data
     const after = (service as any).tempStore.get(tempId);
     expect(after.data.nik).toBe('1234567890123456');
   });
 
   it('confirmAndQueue handles gRPC failure and login failure with fallbacks', async () => {
     // Arrange: queue AddToQueue will be replaced to throw, login will fail, user check returns 204 so no create
     (service as any).queueGrpc = {
  AddToQueue: jest.fn().mockImplementation(() => {
    throw new Error('grpc down');
  }),
} as any; 
     const data = {
       nik: '1234567890123456',
       nama: 'John',
       alamat: { name: 'Jl. Melati' },
     };
 
     // user check returns 204 => skip create
     (httpService.get as jest.Mock).mockReturnValue(of({ status: 204 }));
     // login fails
     (httpService.post as jest.Mock).mockReturnValue(throwError(() => new Error('login error')));
 
     const result = await service.confirmAndQueue(data, 'inst-x');
     expect(result.success).toBe(true);
     expect(result.queue.grpcFallback).toBe(true);
     expect(result.tokens).toMatchObject({ error: 'login_failed' });
   });
 });

  it('patchTempRecord merges ktp, user, and institution patches when valid', () => {
    const base = { result: { nik: '1234567890123456', nama: 'JOHNDOE', tempat_lahir: 'A' } };
    const { tempId } = service.createTempRecord(base);
    const merged = service.patchTempRecord(tempId, {
      ktp: { nama: 'JOHN DOE', tempat_lahir: 'B' }, // small name change acceptable
      user: { email: 'x@example.com' },
      institution: { institutionId: 'inst-1' },
    } as any);
    expect(merged.data.nama).toContain('JOHN');
    expect(merged.data.tempat_lahir).toBe('B');
    expect(merged.data.email).toBe('x@example.com');
    expect(merged.data.institutionId).toBe('inst-1');
  });

  it('confirmFromTemp returns structured error when temp not found', async () => {
    const result = await service.confirmFromTemp('NOT-FOUND', 'inst-1');
    expect(result.success).toBe(false);
    expect(result.code).toBe('TEMP_NOT_FOUND');
  });

  it('confirmFromTemp success path deletes temp and returns payload', async () => {
    const data = {
      nik: '1234567890123456',
      nama: 'John Doe',
      alamat: { name: 'Jl. Mawar' },
      agama: 'ISLAM',
    };
    const { tempId } = service.createTempRecord({ result: data });
    // Mock HTTP calls for user check/create and login
    (httpService.get as jest.Mock).mockReturnValue(of({ status: 404 }));
    (httpService.post as jest.Mock)
      .mockReturnValueOnce(of({ status: 201, data: { id: 'user-1' } })) // create user
      .mockReturnValueOnce(of({ status: 200, data: { access_token: 'A', refresh_token: 'R' } })); // login

    const result = await service.confirmFromTemp(tempId, 'inst-9');
    expect(result.success).toBe(true);
    // temp should be deleted
    expect((service as any).tempStore.get(tempId)).toBeUndefined();
  });
});
// Additional edge-case unit tests for OcrService

describe('OcrService - additional edge cases', () => {
  let service: OcrService;
  let httpService: jest.Mocked<HttpService>;
  let mockClientGrpc: { getService: jest.Mock };

  beforeEach(async () => {
    const httpMock: Partial<HttpService> = {
      post: jest.fn(),
      get: jest.fn(),
    };
    mockClientGrpc = {
      getService: jest.fn().mockReturnValue({
        AddToQueue: jest.fn().mockReturnValue(of({ success: true, message: 'ok' })), // no dataJson path
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: HttpService,
          useValue: httpMock,
        },
        {
          provide: 'QUEUE_GRPC',
          useValue: mockClientGrpc as unknown as ClientGrpc,
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
    jest.clearAllMocks();
    service.onModuleInit();
  });

  it('processImage throws on invalid file payload (no buffer/mimetype)', async () => {
    const badFile = { originalname: 'x.jpg' } as unknown as Express.Multer.File;
    await expect(service.processImage(badFile)).rejects.toThrow(/Invalid file payload/);
  });

  it('confirmAndQueue handles gRPC without dataJson and builds address text', async () => {
    (httpService.get as jest.Mock).mockReturnValue(of({ status: 204 })); // skip create
    (httpService.post as jest.Mock).mockReturnValue(of({ status: 200, data: { access_token: 't' } }));

    const data = {
      nik: '1234567890123456',
      nama: 'Jane',
      alamat: { name: 'Jl. A', rt_rw: '01/02', kel_desa: 'Kel', kecamatan: 'Kec' },
      agama: 'ISLAM',
    };
    const res = await service.confirmAndQueue(data, 'inst-2');
    expect(res.success).toBe(true);
    expect(res.queue).toMatchObject({ success: true, message: 'ok' });
  });

  it('sweepExpiredTemps removes entries past TTL', () => {
    const freshId = 'TMP-FRESH';
    const oldId = 'TMP-OLD-2';
    (service as any).tempStore.set(freshId, { data: { x: 1 }, createdAt: Date.now() });
    (service as any).tempStore.set(oldId, { data: { x: 2 }, createdAt: Date.now() - 5 * 60 * 60 * 1000 });
    (service as any).sweepExpiredTemps();
    expect((service as any).tempStore.get(freshId)).toBeDefined();
    expect((service as any).tempStore.get(oldId)).toBeUndefined();
  });
});
// Field mapping and defaults verification for AddToQueue payload
describe('OcrService - AddToQueue payload mapping', () => {
  let service: OcrService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const httpMock: Partial<HttpService> = {
      post: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: HttpService,
          useValue: httpMock,
        },
        {
          provide: 'QUEUE_GRPC',
          useValue: { getService: jest.fn() } as unknown as ClientGrpc,
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
    jest.clearAllMocks();
  });

  it('confirmAndQueue maps fields and applies defaults for alamat/agama when missing', async () => {
    // Prepare queueGrpc spy to inspect payload
    const addSpy = jest.fn().mockReturnValue(of({ success: true, message: 'ok' }));
    (service as any).queueGrpc = { AddToQueue: addSpy };

    // User check returns 204 (user exists) so skip create; login success
    (httpService.get as jest.Mock).mockReturnValue(of({ status: 204 }));
    (httpService.post as jest.Mock).mockReturnValue(of({ status: 200, data: { access_token: 'T' } }));

    // Provide minimal data (missing alamat/agama)
    const data = {
      nik: '1234567890123456',
      nama: 'Jane',
      // no alamat, no agama
      jenis_kelamin: '',
      tempat_lahir: '',
      tgl_lahir: '',
    };

    const res = await service.confirmAndQueue(data as any, undefined);

    expect(res.success).toBe(true);
    expect(addSpy).toHaveBeenCalledTimes(1);
    const payload = addSpy.mock.calls[0][0];

    // Required fields
    expect(payload.nik).toBe(String(data.nik));
    expect(payload.nama).toBe(String(data.nama));
    // Defaults applied
    expect(payload.alamat).toBe('-');
    expect(payload.agama).toBe('-');
    // Strings for optional fields
    expect(typeof payload.tempat_lahir).toBe('string');
    expect(typeof payload.tgl_lahir).toBe('string');
    expect(typeof payload.jenis_kelamin).toBe('string');
  });
});