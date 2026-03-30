import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [WebhooksService, WebhookDeliveryService],
  exports: [WebhookDeliveryService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
