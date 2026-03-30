import { createPayoutSchema } from './create-payout.dto';

describe('createPayoutSchema', () => {
  const validBody = {
    amount: '100.00',
    currency: 'USDC',
    network: 'base',
    recipient: { type: 'wallet', address: '0xabc123' },
  };

  it('should accept valid payout body', () => {
    const result = createPayoutSchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('should reject non-decimal amount', () => {
    const result = createPayoutSchema.safeParse({
      ...validBody,
      amount: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('should reject amount with more than 6 decimal places', () => {
    const result = createPayoutSchema.safeParse({
      ...validBody,
      amount: '100.1234567',
    });
    expect(result.success).toBe(false);
  });

  it('should accept amount with no decimals', () => {
    const result = createPayoutSchema.safeParse({
      ...validBody,
      amount: '100',
    });
    expect(result.success).toBe(true);
  });

  it('should reject unsupported currency', () => {
    const result = createPayoutSchema.safeParse({
      ...validBody,
      currency: 'EUR',
    });
    expect(result.success).toBe(false);
  });

  it('should reject unsupported network', () => {
    const result = createPayoutSchema.safeParse({
      ...validBody,
      network: 'solana',
    });
    expect(result.success).toBe(false);
  });

  it('should reject wallet recipient without address', () => {
    const result = createPayoutSchema.safeParse({
      ...validBody,
      recipient: { type: 'wallet' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing recipient', () => {
    const { recipient: _, ...noRecipient } = validBody;
    void _;
    const result = createPayoutSchema.safeParse(noRecipient);
    expect(result.success).toBe(false);
  });
});
