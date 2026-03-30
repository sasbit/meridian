import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from './api-key.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prisma: { apiKey: { create: jest.Mock; findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      apiKey: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeyService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  describe('generateApiKey', () => {
    it('should return a raw key starting with sk_', async () => {
      prisma.apiKey.create.mockResolvedValue({});

      const rawKey = await service.generateApiKey('merchant-1', 'test-key');

      expect(rawKey).toMatch(/^sk_[a-f0-9]{64}$/);
    });

    it('should store the hashed key, not the raw key', async () => {
      prisma.apiKey.create.mockResolvedValue({});

      const rawKey = await service.generateApiKey('merchant-1', 'test-key');
      const expectedHash = crypto
        .createHash('sha256')
        .update(rawKey)
        .digest('hex');

      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          merchantId: 'merchant-1',
          name: 'test-key',
          hashedKey: expectedHash,
          isActive: true,
        },
      });
    });
  });

  describe('validateKey', () => {
    it('should return the api key record for a valid key', async () => {
      const mockKey = { id: 'key-1', merchantId: 'merchant-1' };
      prisma.apiKey.findFirst.mockResolvedValue(mockKey);

      const result = await service.validateKey('sk_somevalidkey');

      expect(result).toEqual(mockKey);
      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: {
          hashedKey: crypto
            .createHash('sha256')
            .update('sk_somevalidkey')
            .digest('hex'),
          isActive: true,
        },
      });
    });

    it('should return null for an invalid key', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      const result = await service.validateKey('sk_invalidkey');

      expect(result).toBeNull();
    });
  });
});
