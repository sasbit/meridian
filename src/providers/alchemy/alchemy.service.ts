import { Injectable, Logger } from '@nestjs/common';
import { Alchemy, Network, WebhookType } from 'alchemy-sdk';

@Injectable()
export class AlchemyService {
  private readonly logger = new Logger(AlchemyService.name);
  private readonly alchemy: Alchemy;

  constructor() {
    this.alchemy = new Alchemy({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: Network.BASE_SEPOLIA,
    });
  }

  async registerAddressWebhook(
    addresses: string[],
    webhookUrl: string,
  ): Promise<string | null> {
    try {
      const webhook = await this.alchemy.notify.createWebhook(
        webhookUrl,
        WebhookType.ADDRESS_ACTIVITY,
        { addresses, network: Network.BASE_SEPOLIA },
      );

      this.logger.log(
        `Registered Alchemy webhook ${webhook.id} for ${addresses.length} address(es)`,
      );

      return webhook.id;
    } catch (err) {
      this.logger.error(`Failed to register Alchemy webhook: ${String(err)}`);
      return null;
    }
  }

  async addAddressToWebhook(
    webhookId: string,
    addresses: string[],
  ): Promise<void> {
    try {
      await this.alchemy.notify.updateWebhook(webhookId, {
        addAddresses: addresses,
      });

      this.logger.log(
        `Added ${addresses.length} address(es) to webhook ${webhookId}`,
      );
    } catch (err) {
      this.logger.error(`Failed to add addresses to webhook: ${String(err)}`);
    }
  }
}
