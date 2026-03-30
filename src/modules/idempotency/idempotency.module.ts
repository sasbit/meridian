import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdempotencyInterceptor } from './idempotency.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class IdempotencyModule {}
