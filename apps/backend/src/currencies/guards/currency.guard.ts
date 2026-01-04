import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { CURRENCY_HEADER } from '../interceptors/currency.interceptor';

@Injectable()
export class CurrencyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const currency = request.headers[CURRENCY_HEADER] as string | undefined;

    if (!currency) {
      return true; // Let interceptor handle default
    }

    // Verify currency exists and is active
    const currencyRecord = await this.prisma.currency.findUnique({
      where: { code: currency.toUpperCase() },
    });

    if (!currencyRecord || !currencyRecord.isActive) {
      // Remove invalid currency from header, will fallback to default
      delete request.headers[CURRENCY_HEADER];
    }

    return true;
  }
}

