import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/errors/errors.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}

process.on('uncaughtException', (err: unknown) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

void bootstrap();
