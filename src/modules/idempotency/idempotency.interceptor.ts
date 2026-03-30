import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, of, from, switchMap } from 'rxjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const TTL_DAYS = 30;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.method !== 'POST') return next.handle();

    const idempotencyKey = request.headers['idempotency-key'] as
      | string
      | undefined;
    if (!idempotencyKey) return next.handle();

    const merchantId = request.merchantId;
    if (!merchantId) return next.handle();

    const requestHash = crypto
      .createHash('sha256')
      .update(
        `${request.method}:${request.path}:${JSON.stringify(request.body)}`,
      )
      .digest('hex');

    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { key_merchantId: { key: idempotencyKey, merchantId } },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key already used with a different request body',
        );
      }

      response.setHeader('Idempotent-Replayed', 'true');
      return of(existing.responseBody);
    }

    return next.handle().pipe(
      switchMap((responseBody: unknown) => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + TTL_DAYS);

        return from(
          this.prisma.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              merchantId,
              requestHash,
              responseBody: responseBody as object,
              expiresAt,
            },
          }),
        ).pipe(switchMap(() => of(responseBody)));
      }),
    );
  }
}
