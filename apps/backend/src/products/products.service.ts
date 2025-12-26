import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number | string;
    limit?: number | string;
    brandId?: string;
    categoryId?: string;
    search?: string;
    featured?: boolean | string;
  }) {
    // Parse query parameters (they come as strings from HTTP)
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;
    
    // Parse featured as boolean if provided
    let featured: boolean | undefined;
    if (query.featured !== undefined) {
      featured = query.featured === 'true' || query.featured === true;
    }

    const where: any = {
      isActive: true,
    };

    if (query.brandId) {
      where.brandId = query.brandId;
    }

    if (query.categoryId) {
      where.categories = {
        some: {
          categoryId: query.categoryId,
        },
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (featured !== undefined) {
      where.isFeatured = featured;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          brand: true,
          productType: true,
          categories: {
            include: {
              category: true,
            },
          },
          variants: {
            where: { isActive: true },
            orderBy: { price: 'asc' },
          },
          attributes: {
            include: {
              attribute: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        brand: true,
        productType: true,
        categories: {
          include: {
            category: true,
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
        attributes: {
          include: {
            attribute: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    return product;
  }
}

