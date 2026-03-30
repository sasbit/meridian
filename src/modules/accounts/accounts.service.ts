import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../providers/blockchain/base.service';
import { keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly baseService: BaseService,
  ) {}

  async createAccount(merchantId: string) {
    const existing = await this.prisma.account.findUnique({
      where: { merchantId },
    });
    if (existing) return this.toResponse(existing);

    const depositAddress = this.deriveAddress(merchantId);

    const account = await this.prisma.account.create({
      data: { merchantId, depositAddress },
    });

    return this.toResponse(account);
  }

  async getBalance(merchantId: string) {
    const account = await this.prisma.account.findUnique({
      where: { merchantId },
    });
    if (!account) return null;

    const balance = await this.baseService.getUsdcBalance(
      account.depositAddress,
    );

    return {
      object: 'balance' as const,
      available: balance,
      currency: 'USDC',
      chain: account.chain,
    };
  }

  async getAccount(merchantId: string) {
    const account = await this.prisma.account.findUnique({
      where: { merchantId },
    });
    return account ? this.toResponse(account) : null;
  }

  private deriveAddress(merchantId: string): string {
    const treasuryKey = process.env.TREASURY_PRIVATE_KEY;
    if (!treasuryKey) {
      return '0x' + Buffer.from(merchantId).toString('hex').padEnd(40, '0');
    }

    const derived = keccak256(toBytes(`${treasuryKey}:${merchantId}`));
    const account = privateKeyToAccount(derived);
    return account.address;
  }

  private toResponse(account: {
    id: string;
    depositAddress: string;
    chain: string;
    label: string | null;
    createdAt: Date;
  }) {
    return {
      object: 'account' as const,
      id: account.id,
      deposit_address: account.depositAddress,
      chain: account.chain,
      label: account.label,
      created_at: account.createdAt.toISOString(),
    };
  }
}
