import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { AlchemyWebhookController } from './alchemy-webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { BlockchainModule } from '../../providers/blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, AuthModule, WebhooksModule, BlockchainModule],
  providers: [PayoutsService],
  controllers: [PayoutsController, AlchemyWebhookController],
})
export class PayoutsModule {}
