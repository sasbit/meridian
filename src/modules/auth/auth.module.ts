import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class AuthModule {}
