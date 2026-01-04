import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

export const CURRENCY_HEADER = 'x-currency';

@Injectable()
export class CurrencyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Priority: query param > cookie > header > default
    let currency: string | undefined;

    // 1. Check query param
    if (request.query?.currency && typeof request.query.currency === 'string') {
      currency = request.query.currency;
    }
    // 2. Check cookie
    else if (request.cookies?.currency) {
      currency = request.cookies.currency;
    }
    // 3. Check header
    else if (request.headers['x-currency']) {
      currency = request.headers['x-currency'] as string;
    }

    // Set currency in request for services to access
    if (currency) {
      request.headers[CURRENCY_HEADER] = currency.toUpperCase();
    }

    return next.handle();
  }
}

