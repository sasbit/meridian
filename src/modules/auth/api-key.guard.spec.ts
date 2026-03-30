import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';

function createMockContext(authHeader?: string) {
  const request = { headers: { authorization: authHeader } } as Record<
    string,
    unknown
  >;
  return {
    ctx: {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext,
    request,
  };
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let apiKeyService: { validateKey: jest.Mock };

  beforeEach(async () => {
    apiKeyService = { validateKey: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: ApiKeyService, useValue: apiKeyService },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
  });

  it('should reject requests with no authorization header', async () => {
    const { ctx } = createMockContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject requests without Bearer prefix', async () => {
    const { ctx } = createMockContext('Token sk_abc');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject invalid API keys', async () => {
    apiKeyService.validateKey.mockResolvedValue(null);
    const { ctx } = createMockContext('Bearer sk_invalid');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow valid API keys and attach merchantId', async () => {
    apiKeyService.validateKey.mockResolvedValue({
      id: 'key-1',
      merchantId: 'merchant-1',
    });
    const { ctx, request } = createMockContext('Bearer sk_valid');

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.merchantId).toBe('merchant-1');
  });
});
