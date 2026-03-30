import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';
import type { PayoutStatus } from '../../../generated/prisma/enums';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { PayoutsService } from './payouts.service';
import { createPayoutSchema } from './create-payout.dto';

@Controller('v1/payouts')
@UseGuards(ApiKeyGuard)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post()
  async create(@Req() req: Request, @Body() body: unknown) {
    const parsed = createPayoutSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.payoutsService.createPayout(req.merchantId!, parsed.data);
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('starting_after') startingAfter?: string,
    @Query('status') status?: PayoutStatus,
  ) {
    return this.payoutsService.listPayouts(
      req.merchantId!,
      limit ? parseInt(limit, 10) : 10,
      startingAfter,
      status,
    );
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const payout = await this.payoutsService.getPayoutById(req.merchantId!, id);

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }
}
