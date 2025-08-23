import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';

describe('QueueService (infrastructure)', () => {
  let service: QueueService;
  const mockClient: Partial<ClientProxy> & { send: jest.Mock } = {
    send: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: 'QUEUE_SERVICE',
          useValue: mockClient,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    jest.clearAllMocks();
  });

  it('addToQueue should delegate to client.send and return resolved value', async () => {
    const payload = { userId: 'u1', institutionId: 'i1' };
    const expected = { id: 'q-1', userId: 'u1', institutionId: 'i1' };
    mockClient.send.mockReturnValue(of(expected));

    const result = await service.addToQueue(payload);
    expect(result).toEqual(expected);
    expect(mockClient.send).toHaveBeenCalledWith('queue.add-to-queue', payload);
  });
});