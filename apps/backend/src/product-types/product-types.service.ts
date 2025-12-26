import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.productType.findMany({
      orderBy: { name: 'asc' },
    });
  }
}

