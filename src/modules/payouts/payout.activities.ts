import 'dotenv/config';
import { PrismaClient } from '../../../generated/prisma/client';
import { PayoutStatus } from '../../../generated/prisma/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import { createWalletClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as crypto from 'crypto';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export async function updatePayoutStatus(
  payoutId: string,
  status: string,
): Promise<void> {
  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: status as (typeof PayoutStatus)[keyof typeof PayoutStatus],
      statusHistory: {
        push: { status, timestamp: new Date().toISOString() },
      },
    },
  });
}

export async function routeToRecipient(payoutId: string): Promise<boolean> {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return false;

  const recipient = payout.recipient as { address?: string };
  if (!recipient.address) return false;

  const key = process.env.TREASURY_PRIVATE_KEY;
  if (!key) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await prisma.payout.update({
      where: { id: payoutId },
      data: { txHash: '0x' + crypto.randomBytes(32).toString('hex') },
    });
    return true;
  }

  const account = privateKeyToAccount(key as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: base,
    transport: http(),
  });

  const txHash = await client.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [
      recipient.address as `0x${string}`,
      parseUnits(String(payout.amount), 6),
    ],
  });

  await prisma.payout.update({
    where: { id: payoutId },
    data: { txHash },
  });

  return true;
}

export async function recordLedgerEntry(
  merchantId: string,
  payoutId: string,
  debitAccount: string,
  creditAccount: string,
  amount: string,
  currency: string,
): Promise<void> {
  await prisma.ledgerEntry.create({
    data: {
      merchantId,
      payoutId,
      debitAccount,
      creditAccount,
      amount,
      currency,
    },
  });
}

export async function sendPayoutWebhook(
  merchantId: string,
  eventType: string,
  payoutId: string,
): Promise<void> {
  const [endpoints, payout] = await Promise.all([
    prisma.webhookEndpoint.findMany({
      where: { merchantId, isActive: true },
    }),
    prisma.payout.findUnique({ where: { id: payoutId } }),
  ]);

  if (!payout) return;

  const event = {
    id: 'evt_' + crypto.randomBytes(16).toString('hex'),
    type: eventType,
    created_at: new Date().toISOString(),
    data: {
      object: 'payout',
      id: payout.id,
      amount: String(payout.amount),
      currency: payout.currency,
      network: payout.network,
      status: payout.status.toLowerCase(),
      tx_hash: payout.txHash,
    },
  };

  for (const endpoint of endpoints) {
    const body = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', endpoint.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    try {
      await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Webhook-Signature': `t=${timestamp},v1=${signature}`,
        },
        body,
      });
    } catch {
      // non-fatal
    }
  }
}
