import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingCalculatorService } from '../pricing/shipping-calculator.service';
import { CheckoutEstimateDto, CreateCheckoutDto } from './dto/checkout.dto';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private shippingCalculator: ShippingCalculatorService,
  ) {}

  private async buildLineItems(items: { variantId: string; quantity: number }[]) {
    const variantIds = items.map((item) => item.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            categories: {
              select: { categoryId: true },
            },
          },
        },
      },
    });

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

    return items.map((item) => {
      const variant = variantMap.get(item.variantId);
      if (!variant) {
        throw new NotFoundException(`Variant ${item.variantId} not found`);
      }
      if (item.quantity > variant.stock) {
        throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);
      }
      return {
        variant,
        quantity: item.quantity,
        price: Number(variant.price),
        categoryIds: variant.product.categories.map((category) => category.categoryId),
      };
    });
  }

  async estimate(dto: CheckoutEstimateDto) {
    const region = await this.shippingCalculator.resolveRegion(dto.regionCode);
    const lineItems = await this.buildLineItems(dto.items);

    const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingOptions = await this.shippingCalculator.listShippingOptions(region.id, subtotal);

    return {
      region: {
        id: region.id,
        code: region.code,
        currency: region.currency,
      },
      subtotal,
      shippingOptions: shippingOptions.map((option) => ({
        ...option,
        total: subtotal + option.price,
      })),
    };
  }

  async create(dto: CreateCheckoutDto) {
    const region = await this.shippingCalculator.resolveRegion(dto.regionCode);
    const lineItems = await this.buildLineItems(dto.items);
    const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = await this.shippingCalculator.calculateShipping(dto.shippingMethodId, subtotal);

    const order = await this.prisma.order.create({
      data: {
        userId: null,
        guestEmail: dto.guestEmail,
        regionId: region.id,
        shippingMethodId: dto.shippingMethodId,
        status: 'PENDING',
        subtotal,
        tax: 0,
        shipping,
        total: subtotal + shipping,
        shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
        billingAddress: dto.billingAddress as unknown as Prisma.InputJsonValue,
        items: {
          create: lineItems.map((item) => ({
            productVariantId: item.variant.id,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
      },
    });

    return order;
  }
}
