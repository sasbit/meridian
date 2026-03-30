import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async generateApiKey(merchantId: string, name: string) {
    const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    await this.prisma.apiKey.create({
      data: { merchantId, name, hashedKey, isActive: true },
    });

    return rawKey;
  }

  async validateKey(rawKey: string) {
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    return this.prisma.apiKey.findFirst({
      where: { hashedKey, isActive: true },
    });
  }
}
