import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StripeHistoryQueryDto } from './dto/stripe-history.dto';

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2026-01-28.clover' });
    }
  }

  private getStripeClient() {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    return this.stripe;
  }

  async create(orderId: string, createPaymentDto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Mock payment processing
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const status = 'COMPLETED'; // In real app, this would come from payment gateway

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: order.total,
        method: createPaymentDto.method,
        status,
        transactionId,
        metadata: createPaymentDto.metadata,
      },
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PROCESSING' },
    });

    return payment;
  }

  async findByOrder(orderId: string) {
    return this.prisma.payment.findUnique({
      where: { orderId },
    });
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        region: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    const customerEmail = order.user?.email || order.guestEmail;
    if (!customerEmail || customerEmail.toLowerCase() !== dto.email.toLowerCase()) {
      throw new BadRequestException('Email does not match order');
    }

    if (order.payment?.status === 'COMPLETED') {
      throw new BadRequestException('Order already paid');
    }

    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Order cannot be paid in current status');
    }

    const amount = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid order total for payment');
    }

    const stripe = this.getStripeClient();
    const currency =
      order.region?.currency?.toLowerCase() ||
      this.configService.get<string>('STRIPE_CURRENCY')?.toLowerCase() ||
      'eur';

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail,
      metadata: {
        orderId: order.id,
        customerEmail,
      },
    });

    await this.prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        amount: order.total,
        method: 'CREDIT_CARD',
        status: 'PENDING',
        transactionId: paymentIntent.id,
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
        },
      },
      update: {
        amount: order.total,
        method: 'CREDIT_CARD',
        status: 'PENDING',
        transactionId: paymentIntent.id,
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
        },
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      order,
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | string[] | undefined) {
    const stripe = this.getStripeClient();
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    if (!signature || Array.isArray(signature)) {
      throw new BadRequestException('Missing Stripe signature');
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;
      if (!orderId) {
        return { received: true };
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              productVariant: {
                include: { product: true },
              },
            },
          },
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          region: true,
          payment: true,
        },
      });

      if (!order) {
        return { received: true };
      }

      const existingPaymentStatus = order.payment?.status;
      await this.prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          amount: order.total,
          method: 'CREDIT_CARD',
          status: 'COMPLETED',
          transactionId: paymentIntent.id,
          metadata: {
            stripePaymentIntentId: paymentIntent.id,
          },
        },
        update: {
          status: 'COMPLETED',
          transactionId: paymentIntent.id,
          metadata: {
            stripePaymentIntentId: paymentIntent.id,
          },
        },
      });

      if (order.status !== 'PROCESSING') {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'PROCESSING' },
        });
      }

      if (existingPaymentStatus !== 'COMPLETED') {
        await this.emailService.sendOrderPlacedAdmin(order);
        await this.emailService.sendOrderConfirmationCustomer(order);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;
      if (!orderId) {
        return { received: true };
      }

      await this.prisma.payment.upsert({
        where: { orderId },
        create: {
          orderId,
          amount: Number(paymentIntent.amount || 0) / 100,
          method: 'CREDIT_CARD',
          status: 'FAILED',
          transactionId: paymentIntent.id,
          metadata: {
            stripePaymentIntentId: paymentIntent.id,
          },
        },
        update: {
          status: 'FAILED',
          transactionId: paymentIntent.id,
          metadata: {
            stripePaymentIntentId: paymentIntent.id,
          },
        },
      });
    }

    return { received: true };
  }

  async listStripePayments(query: StripeHistoryQueryDto) {
    const stripe = this.getStripeClient();
    const limit = Math.min(Math.max(query.limit || 10, 1), 100);
    const hasFilters = !!query.orderId || !!query.email;

    let results: Stripe.ApiSearchResult<Stripe.PaymentIntent> | Stripe.ApiList<Stripe.PaymentIntent>;

    if (hasFilters) {
      const clauses = [];
      if (query.orderId) {
        clauses.push(`metadata['orderId']:'${query.orderId}'`);
      }
      if (query.email) {
        clauses.push(`metadata['customerEmail']:'${query.email}'`);
      }
      const searchQuery = clauses.join(' AND ');
      results = await stripe.paymentIntents.search({
        query: searchQuery,
        limit,
      });
    } else {
      results = await stripe.paymentIntents.list({ limit });
    }

    const orderIds = Array.from(
      new Set(
        results.data
          .map((intent) => intent.metadata?.orderId)
          .filter((orderId): orderId is string => !!orderId),
      ),
    );

    const orders = orderIds.length
      ? await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
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
        })
      : [];

    const orderMap = new Map(orders.map((order) => [order.id, order]));

    return results.data.map((intent) => ({
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      created: intent.created,
      metadata: intent.metadata,
      order: intent.metadata?.orderId ? orderMap.get(intent.metadata.orderId) || null : null,
    }));
  }
}

