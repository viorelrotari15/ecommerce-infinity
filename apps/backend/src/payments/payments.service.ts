import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

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
}

