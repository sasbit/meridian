import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async createEndpoint(merchantId: string, url: string) {
    const secret = crypto.randomBytes(32).toString('hex');
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        merchantId,
        url,
        secret,
        isActive: true,
      },
    });

    return endpoint;
  }

  async listEndpoints(merchantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      omit: { secret: true },
      where: { merchantId, isActive: true },
    });
  }

  async getEndpointsByMerchantId(merchantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { merchantId, isActive: true },
    });
  }
}
