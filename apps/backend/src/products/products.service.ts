import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * Convert legacy images array paths to full URLs
   */
  private convertLegacyImages(images: string[]): string[] {
    if (!images || images.length === 0) {
      return [];
    }
    const bucket = this.storageService.getBucketName();
    return images.map((imagePath) => {
      // If already a full URL, return as-is
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      // Convert relative paths like /images/products/... to full URLs
      // Remove leading /images/ prefix if present
      let cleanPath = imagePath.startsWith('/images/')
        ? imagePath.slice('/images/'.length)
        : imagePath.startsWith('/')
          ? imagePath.slice(1)
          : imagePath;

      // Remove bucket name from path if present (to avoid duplicate in URL)
      // Legacy paths might be like "products/aurora-sport-1.jpg" but bucket is already "products"
      if (cleanPath.startsWith(`${bucket}/`)) {
        cleanPath = cleanPath.slice(bucket.length + 1);
      }

      return this.storageService.getPublicUrl(bucket, cleanPath);
    });
  }

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
          productImages: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Add URLs to product images and convert legacy images
    const bucket = this.storageService.getBucketName();
    const productsWithImageUrls = products.map((product) => ({
      ...product,
      images: this.convertLegacyImages(product.images),
      productImages: product.productImages.map((image) => ({
        ...image,
        url: this.storageService.getPublicUrl(bucket, image.filepath),
      })),
    }));

    return {
      data: productsWithImageUrls,
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
        productImages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    // Add URLs to product images and convert legacy images
    const bucket = this.storageService.getBucketName();
    const productWithImageUrls = {
      ...product,
      images: this.convertLegacyImages(product.images),
      productImages: product.productImages.map((image) => ({
        ...image,
        url: this.storageService.getPublicUrl(bucket, image.filepath),
      })),
    };

    return productWithImageUrls;
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        productType: true,
        categories: {
          include: {
            category: true,
          },
        },
        variants: {
          orderBy: { price: 'asc' },
        },
        attributes: {
          include: {
            attribute: true,
          },
        },
        productImages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Add URLs to product images and convert legacy images
    const bucket = this.storageService.getBucketName();
    const productWithImageUrls = {
      ...product,
      images: this.convertLegacyImages(product.images),
      productImages: product.productImages.map((image) => ({
        ...image,
        url: this.storageService.getPublicUrl(bucket, image.filepath),
      })),
    };

    return productWithImageUrls;
  }

  async create(createProductDto: CreateProductDto) {
    // Verify brand exists
    const brand = await this.prisma.brand.findUnique({
      where: { id: createProductDto.brandId },
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${createProductDto.brandId} not found`);
    }

    // Verify product type exists
    const productType = await this.prisma.productType.findUnique({
      where: { id: createProductDto.productTypeId },
    });
    if (!productType) {
      throw new NotFoundException(
        `Product type with ID ${createProductDto.productTypeId} not found`,
      );
    }

    // Verify categories exist
    const categories = await this.prisma.category.findMany({
      where: { id: { in: createProductDto.categoryIds } },
    });
    if (categories.length !== createProductDto.categoryIds.length) {
      throw new BadRequestException('One or more categories not found');
    }

    // Verify SKU is unique
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku: createProductDto.sku },
    });
    if (existingProduct) {
      throw new BadRequestException(`Product with SKU ${createProductDto.sku} already exists`);
    }

    // Verify slug is unique
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug: createProductDto.slug },
    });
    if (existingSlug) {
      throw new BadRequestException(`Product with slug ${createProductDto.slug} already exists`);
    }

    // Create product with variants, categories, and attributes
    const { categoryIds, variants, attributes, ...productData } = createProductDto;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        isActive: productData.isActive ?? true,
        isFeatured: productData.isFeatured ?? false,
        variants: {
          create: variants.map((variant) => ({
            ...variant,
            isActive: variant.isActive ?? true,
          })),
        },
        categories: {
          create: categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
        attributes: attributes
          ? {
              create: attributes.map((attr) => ({
                attributeId: attr.attributeId,
                value: attr.value,
              })),
            }
          : undefined,
      },
      include: {
        brand: true,
        productType: true,
        categories: {
          include: {
            category: true,
          },
        },
        variants: true,
        attributes: {
          include: {
            attribute: true,
          },
        },
        productImages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Add URLs to product images and convert legacy images
    const bucket = this.storageService.getBucketName();
    const productWithImageUrls = {
      ...product,
      images: this.convertLegacyImages(product.images),
      productImages: product.productImages.map((image) => ({
        ...image,
        url: this.storageService.getPublicUrl(bucket, image.filepath),
      })),
    };

    return productWithImageUrls;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // If updating brand, verify it exists
    if (updateProductDto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: updateProductDto.brandId },
      });
      if (!brand) {
        throw new NotFoundException(`Brand with ID ${updateProductDto.brandId} not found`);
      }
    }

    // If updating product type, verify it exists
    if (updateProductDto.productTypeId) {
      const productType = await this.prisma.productType.findUnique({
        where: { id: updateProductDto.productTypeId },
      });
      if (!productType) {
        throw new NotFoundException(
          `Product type with ID ${updateProductDto.productTypeId} not found`,
        );
      }
    }

    // If updating SKU, verify it's unique
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });
      if (existingProduct) {
        throw new BadRequestException(`Product with SKU ${updateProductDto.sku} already exists`);
      }
    }

    // If updating slug, verify it's unique
    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existingSlug = await this.prisma.product.findUnique({
        where: { slug: updateProductDto.slug },
      });
      if (existingSlug) {
        throw new BadRequestException(`Product with slug ${updateProductDto.slug} already exists`);
      }
    }

    const { categoryIds, variants, attributes, ...productData } = updateProductDto;

    // Update product
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(categoryIds && {
          categories: {
            deleteMany: {},
            create: categoryIds.map((categoryId) => ({
              categoryId,
            })),
          },
        }),
        ...(variants && {
          variants: {
            deleteMany: {},
            create: variants.map((variant) => ({
              ...variant,
              isActive: variant.isActive ?? true,
            })),
          },
        }),
        ...(attributes && {
          attributes: {
            deleteMany: {},
            create: attributes.map((attr) => ({
              attributeId: attr.attributeId,
              value: attr.value,
            })),
          },
        }),
      },
      include: {
        brand: true,
        productType: true,
        categories: {
          include: {
            category: true,
          },
        },
        variants: true,
        attributes: {
          include: {
            attribute: true,
          },
        },
        productImages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Add URLs to product images and convert legacy images
    const bucket = this.storageService.getBucketName();
    return {
      ...updatedProduct,
      images: this.convertLegacyImages(updatedProduct.images),
      productImages: updatedProduct.productImages.map((image) => ({
        ...image,
        url: this.storageService.getPublicUrl(bucket, image.filepath),
      })),
    };
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { productImages: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Delete images from MinIO
    if (product.productImages.length > 0) {
      const bucket = this.storageService.getBucketName();
      const filepaths = product.productImages.map((img) => img.filepath);
      await this.storageService.deleteFiles(bucket, filepaths);
    }

    // Delete product (cascades to images, variants, etc.)
    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }
}
