import { Injectable, NotFoundException } from '@nestjs/common';
import { ReturnRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';

export type CreateReturnPayload = {
  orderNumber: string;
  fullName: string;
  email: string;
  deliveryAddress: string;
  requestType: string;
  reason: string;
  language?: string;
};

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(payload: CreateReturnPayload) {
    return this.prisma.returnRequest.create({
      data: {
        orderNumber: payload.orderNumber.trim(),
        fullName: payload.fullName.trim(),
        email: payload.email.trim(),
        deliveryAddress: payload.deliveryAddress.trim(),
        requestType: payload.requestType.trim(),
        reason: (payload.reason || '—').trim(),
        language: payload.language?.trim() || null,
        status: 'PENDING',
      },
    });
  }

  async findAllAdmin(params: {
    page?: number;
    limit?: number;
    status?: ReturnRequestStatus;
    orderNumber?: string;
    email?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.orderNumber?.trim()) {
      where.orderNumber = { contains: params.orderNumber.trim(), mode: 'insensitive' };
    }
    if (params.email?.trim()) {
      where.email = { contains: params.email.trim(), mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneAdmin(id: string) {
    const row = await this.prisma.returnRequest.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException(`Return request ${id} not found`);
    }
    return row;
  }

  async updateStatus(id: string, dto: UpdateReturnStatusDto) {
    await this.findOneAdmin(id);
    return this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.adminNotes !== undefined && { adminNotes: dto.adminNotes }),
      },
    });
  }
}
