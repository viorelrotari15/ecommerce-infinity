import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';

@Injectable()
export class ProductTypesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a URL-friendly slug from text
   */
  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /**
   * Generate a unique slug from base text
   */
  private async generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.productType.findUnique({
        where: { slug },
      });

      // If no existing product type, or it's the same product type being updated
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      // If slug exists, append counter
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async findAll() {
    return this.prisma.productType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(createProductTypeDto: CreateProductTypeDto) {
    // Check if product type with same name already exists
    const existingProductType = await this.prisma.productType.findUnique({
      where: { name: createProductTypeDto.name },
    });

    if (existingProductType) {
      throw new ConflictException(
        `Product type with name "${createProductTypeDto.name}" already exists`,
      );
    }

    // Generate unique slug
    const baseSlug = this.slugify(createProductTypeDto.name);
    const slug = await this.generateUniqueSlug(baseSlug);

    return this.prisma.productType.create({
      data: {
        name: createProductTypeDto.name,
        slug,
        description: createProductTypeDto.description,
      },
    });
  }

  async update(id: string, updateProductTypeDto: UpdateProductTypeDto) {
    const productType = await this.prisma.productType.findUnique({
      where: { id },
    });

    if (!productType) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    // If name is being updated, check for conflicts and regenerate slug
    let slug = productType.slug;
    if (updateProductTypeDto.name && updateProductTypeDto.name !== productType.name) {
      const existingProductType = await this.prisma.productType.findUnique({
        where: { name: updateProductTypeDto.name },
      });

      if (existingProductType && existingProductType.id !== id) {
        throw new ConflictException(
          `Product type with name "${updateProductTypeDto.name}" already exists`,
        );
      }

      const baseSlug = this.slugify(updateProductTypeDto.name);
      slug = await this.generateUniqueSlug(baseSlug, id);
    }

    return this.prisma.productType.update({
      where: { id },
      data: {
        ...updateProductTypeDto,
        slug,
      },
    });
  }

  async remove(id: string) {
    const productType = await this.prisma.productType.findUnique({
      where: { id },
      include: {
        products: {
          take: 1,
        },
      },
    });

    if (!productType) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    // Check if product type has products
    if (productType.products.length > 0) {
      throw new ConflictException(
        `Cannot delete product type "${productType.name}" because it has associated products`,
      );
    }

    return this.prisma.productType.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    const productType = await this.prisma.productType.findUnique({
      where: { id },
    });

    if (!productType) {
      throw new NotFoundException(`Product type with ID ${id} not found`);
    }

    return productType;
  }
}

