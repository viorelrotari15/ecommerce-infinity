import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
        method.rules.find(
          (rule) => rule.minSubtotal.equals(new Prisma.Decimal(0)) && rule.maxSubtotal == null,
        ) || method.rules[0];

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
    const existing = await this.prisma.shippingMethod.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shipping method ${id} not found`);
    }

    const updateData: any = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.carrier !== undefined) updateData.carrier = dto.carrier;
    if (dto.isExpress !== undefined) updateData.isExpress = dto.isExpress;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.shippingMethod.update({
      where: { id },
      data: updateData,
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
    const existing = await this.prisma.shippingRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shipping rule ${id} not found`);
    }

    const updateData: any = {};
    if (dto.minSubtotal !== undefined) updateData.minSubtotal = dto.minSubtotal;
    if (dto.maxSubtotal !== undefined) updateData.maxSubtotal = dto.maxSubtotal;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.shippingRule.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteShippingRule(id: string) {
    return this.prisma.shippingRule.delete({ where: { id } });
  }
}
