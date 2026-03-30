import { Test, TestingModule } from '@nestjs/testing';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhooksService } from './webhooks.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;
  let webhooksService: { getEndpointsByMerchantId: jest.Mock };

  beforeEach(async () => {
    webhooksService = { getEndpointsByMerchantId: jest.fn() };
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveryService,
        { provide: WebhooksService, useValue: webhooksService },
      ],
    }).compile();

    service = module.get<WebhookDeliveryService>(WebhookDeliveryService);
  });

  it('should POST signed event to all merchant endpoints', async () => {
    webhooksService.getEndpointsByMerchantId.mockResolvedValue([
      { url: 'https://merchant.com/hook', secret: 'test-secret' },
    ]);
    mockFetch.mockResolvedValue({ status: 200 });

    await service.sendEvent('merchant-1', 'payout.created', { id: 'po_1' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://merchant.com/hook');
    expect(opts.method).toBe('POST');

    const headers = opts.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Webhook-Signature']).toMatch(/^t=\d+,v1=[a-f0-9]+$/);

    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body.type).toBe('payout.created');
    expect((body.id as string).startsWith('evt_')).toBe(true);
  });

  it('should not crash when delivery fails', async () => {
    webhooksService.getEndpointsByMerchantId.mockResolvedValue([
      { url: 'https://bad.com/hook', secret: 'test-secret' },
    ]);
    mockFetch.mockRejectedValue(new Error('network error'));

    await expect(
      service.sendEvent('merchant-1', 'payout.created', {}),
    ).resolves.not.toThrow();
  });

  it('should send to multiple endpoints', async () => {
    webhooksService.getEndpointsByMerchantId.mockResolvedValue([
      { url: 'https://a.com/hook', secret: 'secret-a' },
      { url: 'https://b.com/hook', secret: 'secret-b' },
    ]);
    mockFetch.mockResolvedValue({ status: 200 });

    await service.sendEvent('merchant-1', 'payout.created', {});

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should skip when merchant has no endpoints', async () => {
    webhooksService.getEndpointsByMerchantId.mockResolvedValue([]);

    await service.sendEvent('merchant-1', 'payout.created', {});

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
