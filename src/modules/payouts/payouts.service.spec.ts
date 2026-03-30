import { Test, TestingModule } from '@nestjs/testing';
import { PayoutsService } from './payouts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';
import { BaseService } from '../../providers/blockchain/base.service';
import { BadRequestException } from '@nestjs/common';

const mockPayout = {
  id: 'po_123',
  merchantId: 'merchant-1',
  amount: '100',
  currency: 'USDC',
  network: 'base',
  status: 'PENDING',
  txHash: null,
  recipient: { type: 'wallet', address: '0xrecipient' },
  statusHistory: [{ status: 'PENDING', timestamp: '2026-01-01T00:00:00.000Z' }],
  idempotencyKey: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockAccount = {
  id: 'acc_1',
  merchantId: 'merchant-1',
  depositAddress: '0xdeposit',
  chain: 'base',
  label: null,
  createdAt: new Date('2026-01-01'),
};

describe('PayoutsService', () => {
  let service: PayoutsService;
  let prisma: {
    payout: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    account: {
      findUnique: jest.Mock;
    };
  };
  let webhookDelivery: { sendEvent: jest.Mock };
  let baseService: { getUsdcBalance: jest.Mock };

  beforeEach(async () => {
    prisma = {
      payout: {
        create: jest.fn().mockResolvedValue(mockPayout),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      account: {
        findUnique: jest.fn().mockResolvedValue(mockAccount),
      },
    };
    webhookDelivery = { sendEvent: jest.fn().mockResolvedValue(undefined) };
    baseService = { getUsdcBalance: jest.fn().mockResolvedValue('500.00') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WebhookDeliveryService, useValue: webhookDelivery },
        { provide: BaseService, useValue: baseService },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
  });

  describe('createPayout', () => {
    it('should check balance and create a payout', async () => {
      const result = await service.createPayout('merchant-1', {
        amount: '100.00',
        currency: 'USDC',
        network: 'base',
        recipient: { type: 'wallet', address: '0xrecipient' },
      });

      expect(result.object).toBe('payout');
      expect(result.id).toBe('po_123');
      expect(result.status).toBe('pending');
      expect(result.tx_hash).toBeNull();
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-1' },
      });
      expect(baseService.getUsdcBalance).toHaveBeenCalledWith('0xdeposit');
      expect(prisma.payout.create).toHaveBeenCalledTimes(1);
    });

    it('should reject when no account exists', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayout('merchant-1', {
          amount: '100.00',
          currency: 'USDC',
          network: 'base',
          recipient: { type: 'wallet', address: '0xrecipient' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when balance is insufficient', async () => {
      baseService.getUsdcBalance.mockResolvedValue('50.00');

      await expect(
        service.createPayout('merchant-1', {
          amount: '100.00',
          currency: 'USDC',
          network: 'base',
          recipient: { type: 'wallet', address: '0xrecipient' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fire a payout.created webhook event', async () => {
      await service.createPayout('merchant-1', {
        amount: '50.00',
        currency: 'USDC',
        network: 'base',
        recipient: { type: 'wallet', address: '0xrecipient' },
      });

      expect(webhookDelivery.sendEvent).toHaveBeenCalledWith(
        'merchant-1',
        'payout.created',
        expect.objectContaining({ object: 'payout' }),
      );
    });
  });

  describe('getPayoutById', () => {
    it('should return payout response when found', async () => {
      prisma.payout.findFirst.mockResolvedValue(mockPayout);

      const result = await service.getPayoutById('merchant-1', 'po_123');

      expect(result).not.toBeNull();
      expect(result!.object).toBe('payout');
      expect(result!.id).toBe('po_123');
    });

    it('should return null when payout not found', async () => {
      prisma.payout.findFirst.mockResolvedValue(null);

      const result = await service.getPayoutById('merchant-1', 'po_missing');

      expect(result).toBeNull();
    });

    it('should scope query to merchantId', async () => {
      prisma.payout.findFirst.mockResolvedValue(null);

      await service.getPayoutById('merchant-1', 'po_123');

      expect(prisma.payout.findFirst).toHaveBeenCalledWith({
        where: { id: 'po_123', merchantId: 'merchant-1' },
      });
    });
  });

  describe('listPayouts', () => {
    it('should return Stripe-style list response', async () => {
      prisma.payout.findMany.mockResolvedValue([mockPayout]);

      const result = await service.listPayouts('merchant-1', 10);

      expect(result.object).toBe('list');
      expect(result.data).toHaveLength(1);
      expect(result.has_more).toBe(false);
      expect(result.url).toBe('/v1/payouts');
    });

    it('should set has_more when more results exist', async () => {
      const payouts = Array.from({ length: 3 }, () => ({ ...mockPayout }));
      prisma.payout.findMany.mockResolvedValue(payouts);

      const result = await service.listPayouts('merchant-1', 2);

      expect(result.has_more).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should cap limit at 100', async () => {
      prisma.payout.findMany.mockResolvedValue([]);

      await service.listPayouts('merchant-1', 500);

      expect(prisma.payout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 101 }),
      );
    });
  });
});
