import {
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AccountsService } from './accounts.service';

@Controller('v1/accounts')
@UseGuards(ApiKeyGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async create(@Req() req: Request) {
    return this.accountsService.createAccount(req.merchantId!);
  }

  @Get('balance')
  async getBalance(@Req() req: Request) {
    const balance = await this.accountsService.getBalance(req.merchantId!);

    if (!balance) {
      throw new NotFoundException('No account found. Create one first.');
    }

    return balance;
  }

  @Get()
  async get(@Req() req: Request) {
    const account = await this.accountsService.getAccount(req.merchantId!);

    if (!account) {
      throw new NotFoundException('No account found. Create one first.');
    }

    return account;
  }
}
