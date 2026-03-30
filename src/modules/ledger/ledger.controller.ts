import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { LedgerService } from './ledger.service';

@Controller('v1/ledger')
@UseGuards(ApiKeyGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  async list(@Req() req: Request, @Query('payout_id') payoutId?: string) {
    return this.ledgerService.listEntries(req.merchantId!, payoutId);
  }
}
