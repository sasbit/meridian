import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './payout.activities';

const {
  updatePayoutStatus,
  routeToRecipient,
  recordLedgerEntry,
  sendPayoutWebhook,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 5 },
});

export interface PayoutWorkflowInput {
  payoutId: string;
  merchantId: string;
  amount: string;
  currency: string;
}

export async function payoutWorkflow(
  input: PayoutWorkflowInput,
): Promise<void> {
  const { payoutId, merchantId, amount, currency } = input;

  await updatePayoutStatus(payoutId, 'ROUTING');
  await recordLedgerEntry(
    merchantId,
    payoutId,
    'merchant_balance',
    'routing_pool',
    amount,
    currency,
  );
  await sendPayoutWebhook(merchantId, 'payout.routing', payoutId);

  const routed = await routeToRecipient(payoutId);
  if (!routed) {
    await updatePayoutStatus(payoutId, 'FAILED');
    await recordLedgerEntry(
      merchantId,
      payoutId,
      'routing_pool',
      'merchant_balance',
      amount,
      currency,
    );
    await sendPayoutWebhook(merchantId, 'payout.failed', payoutId);
    return;
  }

  await updatePayoutStatus(payoutId, 'DELIVERED');
  await recordLedgerEntry(
    merchantId,
    payoutId,
    'routing_pool',
    'settlement',
    amount,
    currency,
  );
  await sendPayoutWebhook(merchantId, 'payout.delivered', payoutId);
}
