import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ACCOUNTS = {
  MERCHANT_ESCROW: 'merchant_escrow',
  ROUTING_POOL: 'routing_pool',
  SETTLEMENT: 'settlement',
} as const;

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async recordFundsReceived(
    merchantId: string,
    payoutId: string,
    amount: string,
    currency: string,
  ) {
    return this.createEntry(
      merchantId,
      payoutId,
      ACCOUNTS.MERCHANT_ESCROW,
      ACCOUNTS.ROUTING_POOL,
      amount,
      currency,
    );
  }

  async recordFundsRouted(
    merchantId: string,
    payoutId: string,
    amount: string,
    currency: string,
  ) {
    return this.createEntry(
      merchantId,
      payoutId,
      ACCOUNTS.ROUTING_POOL,
      ACCOUNTS.SETTLEMENT,
      amount,
      currency,
    );
  }

  async recordFailed(
    merchantId: string,
    payoutId: string,
    amount: string,
    currency: string,
  ) {
    return this.createEntry(
      merchantId,
      payoutId,
      ACCOUNTS.ROUTING_POOL,
      ACCOUNTS.MERCHANT_ESCROW,
      amount,
      currency,
    );
  }

  async listEntries(merchantId: string, payoutId?: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { merchantId, ...(payoutId && { payoutId }) },
      orderBy: { createdAt: 'desc' },
    });

    return {
      object: 'list' as const,
      data: entries.map((e) => ({
        object: 'ledger_entry' as const,
        id: e.id,
        debit_account: e.debitAccount,
        credit_account: e.creditAccount,
        amount: String(e.amount),
        currency: e.currency,
        payout_id: e.payoutId,
        created_at: e.createdAt.toISOString(),
      })),
      url: '/v1/ledger',
    };
  }

  private async createEntry(
    merchantId: string,
    payoutId: string,
    debitAccount: string,
    creditAccount: string,
    amount: string,
    currency: string,
  ) {
    return this.prisma.ledgerEntry.create({
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
}
