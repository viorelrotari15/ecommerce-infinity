import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxRateDto, UpdateTaxRateDto } from './dto/tax-rate.dto';
import { CreateShippingMethodDto, UpdateShippingMethodDto } from './dto/shipping-method.dto';
import { CreateShippingRuleDto, UpdateShippingRuleDto } from './dto/shipping-rule.dto';

@Injectable()
export class PricingAdminService {
  constructor(private prisma: PrismaService) {}

  private readonly defaultRegionCode = 'DE';
  private readonly defaultShipping = {
    standard: {
      code: 'standard',
      name: 'DHL Standard',
      carrier: 'DHL',
      isExpress: false,
      price: 4.99,
    },
    express: {
      code: 'express',
      name: 'DHL Express',
      carrier: 'DHL',
      isExpress: true,
      price: 14.99,
    },
  };

  private async ensureRegion(code?: string) {
    const regionCode = code || this.defaultRegionCode;
    const region = await this.prisma.region.findUnique({ where: { code: regionCode } });
    if (region) {
      return region;
    }
    return this.prisma.region.create({
      data: {
        code: regionCode,
        name: regionCode === 'DE' ? 'Germany' : regionCode,
        currency: 'EUR',
        isDefault: regionCode === this.defaultRegionCode,
        isActive: true,
      },
    });
  }

  private async ensureDefaultShipping(regionId: string) {
    const methods = await Promise.all(
      [this.defaultShipping.standard, this.defaultShipping.express].map((method) =>
        this.prisma.shippingMethod.upsert({
          where: {
            regionId_code: {
              regionId,
              code: method.code,
            },
          },
          update: {
            name: method.name,
            carrier: method.carrier,
            isExpress: method.isExpress,
            isActive: true,
          },
          create: {
            regionId,
            code: method.code,
            name: method.name,
            carrier: method.carrier,
            isExpress: method.isExpress,
            isActive: true,
          },
        }),
      ),
    );

    for (const method of methods) {
      const defaultPrice =
        method.code === this.defaultShipping.express.code
          ? this.defaultShipping.express.price
          : this.defaultShipping.standard.price;

      const existingRule = await this.prisma.shippingRule.findFirst({
        where: {
          shippingMethodId: method.id,
          minSubtotal: 0,
          maxSubtotal: null,
        },
      });

      if (!existingRule) {
        await this.prisma.shippingRule.create({
          data: {
            shippingMethodId: method.id,
            minSubtotal: 0,
            maxSubtotal: null,
            price: defaultPrice,
            isActive: true,
          },
        });
      }
    }
  }

  async listRegions() {
    return this.prisma.region.findMany({ orderBy: { code: 'asc' } });
  }

  async listTaxRates(regionCode?: string) {
    const region = regionCode
      ? await this.prisma.region.findUnique({ where: { code: regionCode } })
      : null;

    if (regionCode && !region) {
      throw new NotFoundException(`Region ${regionCode} not found`);
    }

    return this.prisma.taxRate.findMany({
      where: region ? { regionId: region.id } : undefined,
      include: {
        region: true,
        category: true,
      },
      orderBy: [{ regionId: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async createTaxRate(dto: CreateTaxRateDto) {
    const region = await this.prisma.region.findUnique({
      where: { code: dto.regionCode },
    });
    if (!region) {
      throw new NotFoundException(`Region ${dto.regionCode} not found`);
    }

    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { regionId: region.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.create({
      data: {
        regionId: region.id,
        name: dto.name,
        rate: dto.rate,
        categoryId: dto.categoryId ?? null,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTaxRate(id: string, dto: UpdateTaxRateDto) {
    const existing = await this.prisma.taxRate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Tax rate ${id} not found`);
    }

    if (dto.isDefault) {
      await this.prisma.taxRate.updateMany({
        where: { regionId: existing.regionId },
        data: { isDefault: false },
      });
    }

    return this.prisma.taxRate.update({
      where: { id },
      data: {
        name: dto.name,
        rate: dto.rate,
        categoryId: dto.categoryId,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });
  }

  async deleteTaxRate(id: string) {
    return this.prisma.taxRate.delete({ where: { id } });
  }

  async listShippingMethods(regionCode?: string) {
    const region = regionCode ? await this.ensureRegion(regionCode) : null;
    if (region) {
      await this.ensureDefaultShipping(region.id);
    }
    return this.prisma.shippingMethod.findMany({
      where: region ? { regionId: region.id } : undefined,
      include: { region: true, rules: true },
      orderBy: [{ regionId: 'asc' }, { isExpress: 'asc' }, { name: 'asc' }],
    });
  }

  async listPublicShippingOptions(regionCode?: string) {
    const region = await this.ensureRegion(regionCode || this.defaultRegionCode);
    await this.ensureDefaultShipping(region.id);

    const methods = await this.prisma.shippingMethod.findMany({
      where: {
        regionId: region.id,
        isActive: true,
      },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: [{ minSubtotal: 'asc' }],
        },
      },
      orderBy: [{ isExpress: 'asc' }, { name: 'asc' }],
    });

    return methods.map((method) => {
      const defaultRule =
        method.rules.find((rule) => rule.minSubtotal === 0 && rule.maxSubtotal == null) ||
        method.rules[0];

      return {
        id: method.id,
        code: method.code,
        name: method.name,
        carrier: method.carrier,
        isExpress: method.isExpress,
        price: defaultRule ? Number(defaultRule.price) : 0,
      };
    });
  }

  async createShippingMethod(dto: CreateShippingMethodDto) {
    const allowedCodes = [this.defaultShipping.standard.code, this.defaultShipping.express.code];
    if (!allowedCodes.includes(dto.code)) {
      throw new BadRequestException('Only DHL standard and express methods are allowed');
    }
    const region = await this.ensureRegion(dto.regionCode);

    return this.prisma.shippingMethod.create({
      data: {
        regionId: region.id,
        code: dto.code,
        name: dto.name,
        carrier: dto.carrier,
        isExpress: dto.isExpress ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateShippingMethod(id: string, dto: UpdateShippingMethodDto) {
    return this.prisma.shippingMethod.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        carrier: dto.carrier,
        isExpress: dto.isExpress,
        isActive: dto.isActive,
      },
    });
  }

  async deleteShippingMethod(id: string) {
    return this.prisma.shippingMethod.delete({ where: { id } });
  }

  async listShippingRules(shippingMethodId?: string) {
    if (shippingMethodId) {
      const method = await this.prisma.shippingMethod.findUnique({
        where: { id: shippingMethodId },
      });
      if (method) {
        await this.ensureDefaultShipping(method.regionId);
      }
    }
    return this.prisma.shippingRule.findMany({
      where: shippingMethodId ? { shippingMethodId } : undefined,
      include: { shippingMethod: true },
      orderBy: [{ shippingMethodId: 'asc' }, { minSubtotal: 'asc' }],
    });
  }

  async createShippingRule(dto: CreateShippingRuleDto) {
    const method = await this.prisma.shippingMethod.findUnique({
      where: { id: dto.shippingMethodId },
    });
    if (!method) {
      throw new NotFoundException('Shipping method not found');
    }

    return this.prisma.shippingRule.create({
      data: {
        shippingMethodId: dto.shippingMethodId,
        minSubtotal: dto.minSubtotal,
        maxSubtotal: dto.maxSubtotal ?? null,
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateShippingRule(id: string, dto: UpdateShippingRuleDto) {
    return this.prisma.shippingRule.update({
      where: { id },
      data: {
        minSubtotal: dto.minSubtotal,
        maxSubtotal: dto.maxSubtotal,
        price: dto.price,
        isActive: dto.isActive,
      },
    });
  }

  async deleteShippingRule(id: string) {
    return this.prisma.shippingRule.delete({ where: { id } });
  }
}
