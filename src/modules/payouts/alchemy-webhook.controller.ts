import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';

interface AlchemyActivity {
  fromAddress: string;
  toAddress: string;
  value: number;
  asset: string;
  category: string;
  hash: string;
}

interface AlchemyWebhookBody {
  webhookId: string;
  id: string;
  type: string;
  event: {
    network: string;
    activity: AlchemyActivity[];
  };
}

@Controller('internal')
export class AlchemyWebhookController {
  private readonly logger = new Logger(AlchemyWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
  ) {}

  @Post('alchemy-webhook')
  async handleAlchemyWebhook(
    @Body() body: AlchemyWebhookBody,
    @Headers('x-alchemy-signature') signature: string,
  ) {
    if (process.env.ALCHEMY_SIGNING_KEY) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.ALCHEMY_SIGNING_KEY)
        .update(JSON.stringify(body))
        .digest('hex');

      if (signature !== expectedSig) {
        throw new UnauthorizedException('Invalid Alchemy webhook signature');
      }
    }

    const activities = body.event?.activity ?? [];

    for (const activity of activities) {
      if (activity.asset !== 'USDC' || activity.category !== 'token') continue;

      const account = await this.prisma.account.findFirst({
        where: { depositAddress: activity.toAddress.toLowerCase() },
      });

      if (!account) continue;

      this.logger.log(
        `Deposit received for merchant ${account.merchantId}: ${String(activity.value)} USDC (tx: ${activity.hash})`,
      );

      this.webhookDeliveryService
        .sendEvent(account.merchantId, 'deposit.received', {
          object: 'deposit',
          amount: String(activity.value),
          currency: 'USDC',
          chain: account.chain,
          tx_hash: activity.hash,
          from_address: activity.fromAddress,
        })
        .catch(() => {});
    }

    return { ok: true };
  }
}
