import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TaxLineItem {
  price: number;
  quantity: number;
  categoryIds: string[];
}

@Injectable()
export class TaxCalculatorService {
  constructor(private prisma: PrismaService) {}

  async resolveRegion(code?: string) {
    if (code) {
      const region = await this.prisma.region.findUnique({ where: { code } });
      if (region) {
        return region;
      }
      throw new NotFoundException(`Region ${code} not found`);
    }

    const defaultRegion = await this.prisma.region.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (defaultRegion) {
      return defaultRegion;
    }

    const fallbackRegion = await this.prisma.region.findFirst({
      where: { isActive: true },
    });
    if (!fallbackRegion) {
      throw new NotFoundException('No active region configured');
    }
    return fallbackRegion;
  }

  async getActiveTaxRates(regionId: string) {
    return this.prisma.taxRate.findMany({
      where: { regionId, isActive: true },
    });
  }

  getApplicableRate(categoryIds: string[], taxRates: Array<{ rate: any; categoryId: string | null; isDefault: boolean }>) {
    if (!taxRates.length) {
      return 0;
    }

    const categoryRates = taxRates.filter(
      (rate) => rate.categoryId && categoryIds.includes(rate.categoryId),
    );
    if (categoryRates.length > 0) {
      return Math.max(...categoryRates.map((rate) => Number(rate.rate)));
    }

    const defaultRate =
      taxRates.find((rate) => rate.isDefault) ||
      taxRates.find((rate) => !rate.categoryId) ||
      taxRates[0];

    return defaultRate ? Number(defaultRate.rate) : 0;
  }

  calculateIncludedTax(
    lineItems: TaxLineItem[],
    taxRates: Array<{ rate: any; categoryId: string | null; isDefault: boolean }>,
  ) {
    return lineItems.reduce((sum, item) => {
      const rate = this.getApplicableRate(item.categoryIds, taxRates);
      if (rate <= 0) {
        return sum;
      }
      const gross = item.price * item.quantity;
      const tax = gross * (rate / (1 + rate));
      return sum + tax;
    }, 0);
  }
}
