import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrenciesService } from './currencies.service';

@Injectable()
export class CurrencyHelperService {
  constructor(
    private prisma: PrismaService,
    private currenciesService: CurrenciesService,
  ) {}

  /**
   * Get instance currency (single currency per instance)
   */
  async getInstanceCurrency(): Promise<string> {
    return this.currenciesService.getInstanceCurrency();
  }

  /**
   * Get default currency (alias for getInstanceCurrency)
   */
  async getDefaultCurrency(): Promise<string> {
    return this.getInstanceCurrency();
  }

  /**
   * Resolve currency - always returns instance currency (no conversion)
   */
  async resolveCurrency(requestCurrency?: string): Promise<string> {
    // Always return instance currency (single currency per instance)
    return this.getInstanceCurrency();
  }

  /**
   * Get price - returns price as-is (no conversion, single currency per instance)
   */
  async getPrice(price: number | string): Promise<{ price: number; currency: string }> {
    const instanceCurrency = await this.getInstanceCurrency();
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;

    return {
      price: priceNum,
      currency: instanceCurrency,
    };
  }

  /**
   * Get instance currency symbol
   */
  async getCurrencySymbol(): Promise<string> {
    const instanceCurrency = await this.getInstanceCurrency();
    const currency = await this.prisma.currency.findUnique({
      where: { code: instanceCurrency },
    });

    return currency?.symbol || instanceCurrency;
  }
}

