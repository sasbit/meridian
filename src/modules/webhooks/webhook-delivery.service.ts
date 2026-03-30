import { Injectable, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  async sendEvent(merchantId: string, type: string, data: unknown) {
    const event = {
      id: 'evt_' + crypto.randomBytes(16).toString('hex'),
      type,
      created_at: new Date().toISOString(),
      data,
    };

    const endpoints =
      await this.webhooksService.getEndpointsByMerchantId(merchantId);

    for (const endpoint of endpoints) {
      const body = JSON.stringify(event);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto
        .createHmac('sha256', endpoint.secret)
        .update(`${timestamp}.${body}`)
        .digest('hex');

      try {
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Webhook-Signature': `t=${timestamp},v1=${signature}`,
          },
          body,
        });

        this.logger.log(
          `Webhook delivered to ${endpoint.url} (${res.status}) for event ${event.id}`,
        );
      } catch (err) {
        this.logger.error(
          `Webhook delivery failed for ${endpoint.url}: ${String(err)}`,
        );
      }
    }
  }
}
