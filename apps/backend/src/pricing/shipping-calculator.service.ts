import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ShippingOption {
  id: string;
  code: string;
  name: string;
  carrier: string;
  isExpress: boolean;
  price: number;
}

@Injectable()
export class ShippingCalculatorService {
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

  private pickRulePrice(
    subtotal: number,
    rules: Array<{ minSubtotal: any; maxSubtotal: any | null; price: any }>,
  ) {
    const candidates = rules.filter((rule) => {
      const min = Number(rule.minSubtotal);
      const max = rule.maxSubtotal === null ? null : Number(rule.maxSubtotal);
      return subtotal >= min && (max === null || subtotal <= max);
    });

    if (candidates.length === 0) {
      return null;
    }

    const bestRule = candidates.sort((a, b) => Number(b.minSubtotal) - Number(a.minSubtotal))[0];
    return Number(bestRule.price);
  }

  async listShippingOptions(regionId: string, subtotal: number): Promise<ShippingOption[]> {
    const methods = await this.prisma.shippingMethod.findMany({
      where: { regionId, isActive: true },
      include: {
        rules: {
          where: { isActive: true },
        },
      },
      orderBy: { isExpress: 'asc' },
    });

    return methods
      .map((method) => {
        const price = this.pickRulePrice(subtotal, method.rules);
        if (price === null) {
          return null;
        }
        return {
          id: method.id,
          code: method.code,
          name: method.name,
          carrier: method.carrier,
          isExpress: method.isExpress,
          price,
        };
      })
      .filter((option): option is ShippingOption => option !== null);
  }

  async calculateShipping(methodId: string, subtotal: number) {
    const method = await this.prisma.shippingMethod.findUnique({
      where: { id: methodId },
      include: {
        rules: {
          where: { isActive: true },
        },
      },
    });

    if (!method || !method.isActive) {
      throw new NotFoundException('Shipping method not found');
    }

    const price = this.pickRulePrice(subtotal, method.rules);
    if (price === null) {
      throw new NotFoundException('No shipping rule available for subtotal');
    }

    return price;
  }
}
