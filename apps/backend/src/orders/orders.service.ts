import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ShippingCalculatorService } from '../pricing/shipping-calculator.service';
import { MetricsService } from '../metrics/metrics.service';
import { EmailService } from '../email/email.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private shippingCalculator: ShippingCalculatorService,
    private metricsService: MetricsService,
    private emailService: EmailService,
    private paymentsService: PaymentsService,
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

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const region = await this.shippingCalculator.resolveRegion(createOrderDto.regionCode);
    const lineItems = await this.buildLineItems(createOrderDto.items);

    const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = 0;

    let shipping = 0;
    if (createOrderDto.shippingMethodId) {
      shipping = await this.shippingCalculator.calculateShipping(
        createOrderDto.shippingMethodId,
        subtotal,
      );
    } else if (createOrderDto.shipping) {
      shipping = createOrderDto.shipping;
    }

    // Create order
    const order = await this.prisma.order.create({
      data: {
        userId,
        regionId: region.id,
        shippingMethodId: createOrderDto.shippingMethodId,
        status: 'PENDING',
        subtotal,
        tax,
        shipping,
        total: subtotal + shipping,
        shippingAddress: createOrderDto.shippingAddress as unknown as Prisma.InputJsonValue,
        billingAddress: createOrderDto.billingAddress as unknown as Prisma.InputJsonValue,
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
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    this.metricsService.incrementOrdersCreated();

    return order;
  }

  async findByUser(userId: string) {
    let orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const toSync = orders.filter(
      (o) => o.payment?.status === 'PENDING' && o.payment?.transactionId,
    );
    if (toSync.length > 0) {
      await Promise.all(
        toSync.map((o) =>
          this.paymentsService.syncPaymentStatusFromStripe(o.id).catch(() => {}),
        ),
      );
      orders = await this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              productVariant: {
                include: { product: true },
              },
            },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return orders;
  }

  async findAll() {
    return this.prisma.order.findMany({
      where: {
        payment: { status: 'COMPLETED' },
      },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        payment: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        region: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(opts?: { orderId?: string; page?: number; limit?: number }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.OrderWhereInput = {
      payment: { status: 'COMPLETED' },
    };

    if (opts?.orderId?.trim()) {
      const search = opts.orderId.trim().replace(/-/g, '').toLowerCase();
      if (search.length === 32) {
        // Full UUID without dashes: exact match (reconstruct UUID format)
        const uuid = `${search.slice(0, 8)}-${search.slice(8, 12)}-${search.slice(12, 16)}-${search.slice(16, 20)}-${search.slice(20, 32)}`;
        (baseWhere as any).id = uuid;
      } else {
        // Short display format (e.g. first 8 chars): prefix match via raw query
        const ids = await this.prisma.$queryRaw<[{ id: string }]>`
          SELECT o.id FROM orders o
          INNER JOIN payments p ON p."orderId" = o.id
          WHERE p.status = 'COMPLETED'
          AND LOWER(REPLACE(o.id::text, '-', '')) LIKE LOWER(${search + '%'})
          ORDER BY o."createdAt" DESC
        `;
        const idList = ids.map((r) => r.id);
        const total = idList.length;
        const pageIds = idList.slice(skip, skip + limit);
        if (pageIds.length === 0) {
          const totalPages = Math.max(1, Math.ceil(total / limit));
          return { data: [], total, page, limit, totalPages };
        }
        const data = await this.prisma.order.findMany({
          where: { id: { in: pageIds } },
          include: {
            items: {
              include: {
                productVariant: {
                  include: { product: true },
                },
              },
            },
            payment: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            region: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        const orderById = new Map(data.map((o) => [o.id, o]));
        const ordered = pageIds.map((id) => orderById.get(id)!).filter(Boolean);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        return { data: ordered, total, page, limit, totalPages };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: baseWhere,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              productVariant: {
                include: { product: true },
              },
            },
          },
          payment: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          region: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: baseWhere }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, total, page, limit, totalPages };
  }

  async findOne(id: string, userId?: string) {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    let order = await this.prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        payment: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        region: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (order.payment?.status === 'PENDING' && order.payment?.transactionId) {
      await this.paymentsService.syncPaymentStatusFromStripe(order.id).catch(() => {});
      order = await this.prisma.order.findFirst({
        where,
        include: {
          items: {
            include: {
              productVariant: {
                include: { product: true },
              },
            },
          },
          payment: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          region: true,
        },
      });
    }

    return order!;
  }

  async findOneAdmin(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
        payment: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        region: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    if (dto.status === 'SHIPPED' && !dto.trackingNumber) {
      throw new BadRequestException('Tracking number is required when order is shipped');
    }

    const data: Prisma.OrderUpdateInput = {
      status: dto.status,
    };

    if (dto.trackingNumber !== undefined) {
      data.trackingNumber = dto.trackingNumber || null;
    }

    const order = await this.prisma.order.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
        payment: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        region: true,
      },
    });

    await this.emailService.sendOrderStatusUpdate(order);

    return order;
  }
}

