import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    const rawKey = authHeader.replace('Bearer ', '');
    const apiKey = await this.apiKeyService.validateKey(rawKey);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.merchantId = apiKey.merchantId;
    return true;
  }
}
