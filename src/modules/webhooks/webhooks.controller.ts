import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { WebhooksService } from './webhooks.service';

@Controller('v1/webhook-endpoints')
@UseGuards(ApiKeyGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async create(@Req() req: Request, @Body() body: { url?: string }) {
    if (!body.url) {
      throw new BadRequestException('url is required');
    }

    const endpoint = await this.webhooksService.createEndpoint(
      req.merchantId!,
      body.url,
    );

    return {
      object: 'webhook_endpoint' as const,
      id: endpoint.id,
      url: endpoint.url,
      secret: endpoint.secret,
      created_at: endpoint.createdAt.toISOString(),
    };
  }

  @Get()
  async list(@Req() req: Request) {
    const endpoints = await this.webhooksService.listEndpoints(req.merchantId!);

    return {
      object: 'list' as const,
      data: endpoints.map((e) => ({
        object: 'webhook_endpoint' as const,
        id: e.id,
        url: e.url,
        is_active: e.isActive,
        created_at: e.createdAt.toISOString(),
      })),
      url: '/v1/webhook-endpoints',
    };
  }
}
