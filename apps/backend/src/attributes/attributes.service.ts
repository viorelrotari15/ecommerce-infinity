import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttributesService {
  constructor(private prisma: PrismaService) {}

  async findByProductType(productTypeId: string) {
    return this.prisma.attribute.findMany({
      where: { productTypeId },
      orderBy: { name: 'asc' },
    });
  }
}

