import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global HTTP exception filter.
 * - In production: never exposes stack traces or internal details (prevents info leakage).
 * - In development: returns full error for debugging.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      message = typeof payload === 'object' && payload !== null && 'message' in payload
        ? (payload as { message?: string | string[] }).message
        : payload;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      if (!isProd) {
        message = exception.message;
      }
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
    };
    if (!isProd && exception instanceof Error && exception.stack) {
      body.stack = exception.stack;
    }

    res.status(status).json(body);
  }
}
