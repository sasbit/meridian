import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Client, Connection } from '@temporalio/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PayoutStatus } from '../../../generated/prisma/enums';
import { CreatePayoutDto } from './create-payout.dto';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';
import { BaseService } from '../../providers/blockchain/base.service';
import { payoutWorkflow } from './payout.workflow';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);
  private temporalClient: Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
    private readonly baseService: BaseService,
  ) {}

  private async getTemporalClient(): Promise<Client> {
    if (!this.temporalClient) {
      const connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      });
      this.temporalClient = new Client({ connection });
    }
    return this.temporalClient;
  }

  async createPayout(merchantId: string, dto: CreatePayoutDto) {
    const account = await this.prisma.account.findUnique({
      where: { merchantId },
    });

    if (!account) {
      throw new BadRequestException(
        'No account found. Create one with POST /v1/accounts first.',
      );
    }

    const balance = await this.baseService.getUsdcBalance(
      account.depositAddress,
    );

    if (parseFloat(balance) < parseFloat(dto.amount)) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance} USDC, requested: ${dto.amount} USDC.`,
      );
    }

    const payout = await this.prisma.payout.create({
      data: {
        merchant: { connect: { id: merchantId } },
        amount: dto.amount,
        currency: dto.currency,
        network: dto.network,
        recipient: dto.recipient,
        statusHistory: [
          { status: 'PENDING', timestamp: new Date().toISOString() },
        ],
      },
    });

    const response = this.toPayoutResponse(payout);

    this.webhookDeliveryService
      .sendEvent(merchantId, 'payout.created', response)
      .catch(() => {});

    this.startPayoutWorkflow(payout.id, merchantId, dto).catch((err) => {
      this.logger.error(
        `Failed to start workflow for payout ${payout.id}: ${String(err)}`,
      );
    });

    return response;
  }

  async getPayoutById(merchantId: string, payoutId: string) {
    const payout = await this.prisma.payout.findFirst({
      where: { id: payoutId, merchantId },
    });

    return payout ? this.toPayoutResponse(payout) : null;
  }

  async listPayouts(
    merchantId: string,
    limit: number,
    startingAfter?: string,
    status?: PayoutStatus,
  ) {
    const take = Math.min(limit, 100);

    const payouts = await this.prisma.payout.findMany({
      where: { merchantId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(startingAfter && {
        cursor: { id: startingAfter },
        skip: 1,
      }),
    });

    const hasMore = payouts.length > take;
    const data = hasMore ? payouts.slice(0, take) : payouts;

    return {
      object: 'list' as const,
      data: data.map((p) => this.toPayoutResponse(p)),
      has_more: hasMore,
      url: '/v1/payouts',
    };
  }

  private async startPayoutWorkflow(
    payoutId: string,
    merchantId: string,
    dto: CreatePayoutDto,
  ) {
    const client = await this.getTemporalClient();

    await client.workflow.start(payoutWorkflow, {
      taskQueue: 'payout-queue',
      workflowId: `payout-${payoutId}`,
      args: [
        {
          payoutId,
          merchantId,
          amount: dto.amount,
          currency: dto.currency,
        },
      ],
    });
  }

  private toPayoutResponse(payout: {
    id: string;
    merchantId: string;
    amount: unknown;
    currency: string;
    network: string;
    status: PayoutStatus;
    txHash: string | null;
    recipient: unknown;
    statusHistory: unknown;
    idempotencyKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      object: 'payout' as const,
      id: payout.id,
      amount: String(payout.amount),
      currency: payout.currency,
      network: payout.network,
      status: payout.status.toLowerCase(),
      tx_hash: payout.txHash,
      recipient: payout.recipient,
      status_history: payout.statusHistory,
      idempotency_key: payout.idempotencyKey,
      created_at: payout.createdAt.toISOString(),
      updated_at: payout.updatedAt.toISOString(),
    };
  }
}
