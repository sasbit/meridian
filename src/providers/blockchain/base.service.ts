import { Injectable, Logger } from '@nestjs/common';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
} from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

@Injectable()
export class BaseService {
  private readonly logger = new Logger(BaseService.name);
  private readonly publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  async sendUsdc(to: string, amount: string): Promise<string> {
    const key = process.env.TREASURY_PRIVATE_KEY;
    if (!key) throw new Error('TREASURY_PRIVATE_KEY not configured');

    const account = privateKeyToAccount(key as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, parseUnits(amount, 6)],
    });

    this.logger.log(`USDC transfer: ${amount} to ${to} (tx: ${hash})`);
    return hash;
  }

  async getUsdcBalance(address: string): Promise<string> {
    const balance = await this.publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    return formatUnits(balance as bigint, 6);
  }
}
