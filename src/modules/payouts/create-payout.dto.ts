import { z } from 'zod';

const recipientSchema = z.object({
  type: z.enum(['wallet', 'bank']),
  address: z.string().optional(),
});

export const createPayoutSchema = z
  .object({
    amount: z
      .string()
      .regex(
        /^\d+(\.\d{1,6})?$/,
        'Amount must be a valid decimal with up to 6 decimal places',
      ),
    currency: z.enum(['USDC']),
    network: z.enum(['base']),
    recipient: recipientSchema,
  })
  .refine(
    (data) => {
      if (data.recipient.type === 'wallet') {
        return !!data.recipient.address;
      }
      return true;
    },
    {
      message: 'Wallet recipient requires an address',
      path: ['recipient', 'address'],
    },
  );

export type CreatePayoutDto = z.infer<typeof createPayoutSchema>;
