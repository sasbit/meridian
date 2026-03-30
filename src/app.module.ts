import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { BlockchainModule } from './providers/blockchain/blockchain.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    PayoutsModule,
    WebhooksModule,
    IdempotencyModule,
    LedgerModule,
    AccountsModule,
    BlockchainModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
