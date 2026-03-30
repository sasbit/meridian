import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiError } from './error-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ApiError) {
      response.status(exception.statusCode).json(exception.toResponse());
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string }).message ?? exception.message);

      const category =
        status === 401
          ? 'authentication_error'
          : status === 409
            ? 'idempotency_error'
            : status === 429
              ? 'rate_limit_error'
              : status >= 500
                ? 'api_error'
                : 'invalid_request_error';

      response.status(status).json({
        error: {
          category,
          code: this.toSnakeCase(exception.name),
          message,
        },
      });
      return;
    }

    this.logger.error(
      `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(500).json({
      error: {
        category: 'api_error',
        code: 'internal_error',
        message: 'An unexpected error occurred.',
      },
    });
  }

  private toSnakeCase(name: string): string {
    return name
      .replace(/Exception$/, '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase();
  }
}
