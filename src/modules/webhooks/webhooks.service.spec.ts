import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: {
    webhookEndpoint: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      webhookEndpoint: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  describe('createEndpoint', () => {
    it('should generate a random secret and store the endpoint', async () => {
      prisma.webhookEndpoint.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'whe_1',
            ...data,
            createdAt: new Date(),
          }),
      );

      const result = await service.createEndpoint(
        'merchant-1',
        'https://example.com/hook',
      );

      expect(result.secret).toMatch(/^[a-f0-9]{64}$/);
      expect(result.url).toBe('https://example.com/hook');
      expect(prisma.webhookEndpoint.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          merchantId: 'merchant-1',
          url: 'https://example.com/hook',
          isActive: true,
        }),
      });
    });
  });

  describe('listEndpoints', () => {
    it('should return endpoints without secrets', async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([
        { id: 'whe_1', url: 'https://example.com/hook', isActive: true },
      ]);

      const result = await service.listEndpoints('merchant-1');

      expect(result).toHaveLength(1);
      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        omit: { secret: true },
        where: { merchantId: 'merchant-1', isActive: true },
      });
    });
  });

  describe('getEndpointsByMerchantId', () => {
    it('should return active endpoints with secrets', async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([
        {
          id: 'whe_1',
          url: 'https://example.com/hook',
          secret: 'abc123',
          isActive: true,
        },
      ]);

      const result = await service.getEndpointsByMerchantId('merchant-1');

      expect(result).toHaveLength(1);
      expect(result[0].secret).toBe('abc123');
      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1', isActive: true },
      });
    });
  });
});
