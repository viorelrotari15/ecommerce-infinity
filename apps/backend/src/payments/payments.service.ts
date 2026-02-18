import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
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

  /** Resolve short display order ID (e.g. 550E8400) to full UUID for Stripe search. */
  private async resolveOrderIdFromShort(shortId: string): Promise<string | null> {
    const prefix = shortId.replace(/[%_]/g, '').toLowerCase();
    if (!prefix) return null;
    const rows = await this.prisma.$queryRaw<[{ id: string }]>(
      Prisma.sql`SELECT id FROM orders WHERE LOWER(REPLACE(id, '-', '')) LIKE ((${prefix})::text || '%') LIMIT 1`,
    );
    return rows[0]?.id ?? null;
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

  /**
   * Confirm payment success for an order after client-side Stripe confirmPayment succeeds.
   * Verifies with Stripe that the payment intent is succeeded, then marks payment COMPLETED.
   * Use when the webhook is not received (e.g. local dev without Stripe CLI).
   */
  async confirmPaymentSuccess(orderId: string) {
    const stripe = this.getStripeClient();
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
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const paymentIntentId = order.payment?.transactionId;
    if (!paymentIntentId) {
      throw new BadRequestException('Order has no Stripe payment intent');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(
        `Payment intent status is ${paymentIntent.status}, not succeeded`,
      );
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

    return { success: true };
  }

  /**
   * Sync payment status from Stripe for an order that has PENDING payment.
   * Tries stored transactionId first; if that intent is not succeeded, searches
   * Stripe by metadata orderId so we still sync when a different intent was paid
   * (e.g. user refreshed and we stored a new intent id). Does not send emails.
   */
  async syncPaymentStatusFromStripe(orderId: string): Promise<void> {
    let stripe: Stripe;
    try {
      stripe = this.getStripeClient();
    } catch {
      return;
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order?.payment) return;
    if (order.payment.status === 'COMPLETED') return;

    let succeededIntentId: string | null = null;

    if (order.payment.transactionId) {
      try {
        const intent = await stripe.paymentIntents.retrieve(order.payment.transactionId);
        if (intent.status === 'succeeded') succeededIntentId = intent.id;
      } catch {
        // transactionId may be wrong or invalid (e.g. new intent after refresh)
      }
    }

    if (!succeededIntentId) {
      try {
        const escaped = orderId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const search = await stripe.paymentIntents.search({
          query: `metadata["orderId"]:"${escaped}"`,
          limit: 10,
        });
        const succeeded = search.data.find((pi) => pi.status === 'succeeded');
        if (succeeded) succeededIntentId = succeeded.id;
      } catch {
        // search not available or failed
      }
    }

    if (!succeededIntentId) return;

    await this.prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        amount: order.total,
        method: 'CREDIT_CARD',
        status: 'COMPLETED',
        transactionId: succeededIntentId,
        metadata: order.payment.metadata as object,
      },
      update: {
        status: 'COMPLETED',
        transactionId: succeededIntentId,
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PROCESSING' },
    });
  }

  async listStripePayments(query: StripeHistoryQueryDto) {
    const stripe = this.getStripeClient();
    // Stripe search/list accept max limit 100; we still accept up to 500 from client and paginate in memory
    const requestedLimit = Math.min(Math.max(query.limit || 20, 1), 500);
    const stripeLimit = Math.min(requestedLimit, 100);
    const hasFilters = !!(query.orderId?.trim() || query.email?.trim());

    let results: Stripe.ApiSearchResult<Stripe.PaymentIntent> | Stripe.ApiList<Stripe.PaymentIntent>;

    try {
      if (hasFilters) {
        const clauses: string[] = [];
        let orderIdForStripe = query.orderId?.trim();
        if (orderIdForStripe) {
          const looksLikeShortOrPrefix = !orderIdForStripe.includes('-');
          if (looksLikeShortOrPrefix) {
            const resolved = await this.resolveOrderIdFromShort(orderIdForStripe);
            if (resolved) orderIdForStripe = resolved;
          }
          const escaped = orderIdForStripe.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          clauses.push(`metadata["orderId"]:"${escaped}"`);
        }
        if (query.email?.trim()) {
          const escaped = query.email.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          clauses.push(`metadata["customerEmail"]:"${escaped}"`);
        }
        const searchQuery = clauses.join(' AND ');
        results = await stripe.paymentIntents.search({
          query: searchQuery,
          limit: stripeLimit,
        });
      } else {
        results = await stripe.paymentIntents.list({ limit: stripeLimit });
      }
    } catch (err: any) {
      if (err?.type === 'StripeInvalidRequestError' || err?.statusCode === 400) {
        return [];
      }
      throw err;
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

