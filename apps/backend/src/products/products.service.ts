import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StorageService } from '../storage/storage.service';
import { LanguageHelperService } from '../languages/language-helper.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private languageHelper: LanguageHelperService,
  ) {}

  /**
   * Apply translations to product with fallback
   */
  private async applyProductTranslations(product: any, language: string) {
    const defaultLanguage = await this.languageHelper.resolveLanguage(undefined);
    
    // Get translation for requested language or fallback
    const translation = await this.languageHelper.getTranslationWithFallback(
      product.translations || [],
      language,
      defaultLanguage,
      (t) => t,
    );

    // Apply translated fields if available
    if (translation) {
      product.name = translation.name || product.name;
      product.description = translation.description || product.description;
      product.shortDescription = translation.shortDescription || product.shortDescription;
      product.metaTitle = translation.metaTitle || product.metaTitle;
      product.metaDescription = translation.metaDescription || product.metaDescription;
    }

    // Remove translations array from response
    delete product.translations;
    return product;
  }

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
      const existing = await this.prisma.product.findUnique({
        where: { slug },
      });

      // If no existing product, or it's the same product being updated
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      // If slug exists, append counter
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Generate a unique SKU for a product
   */
  private async generateProductSku(brandId: string, productTypeId: string): Promise<string> {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    const productType = await this.prisma.productType.findUnique({ where: { id: productTypeId } });

    if (!brand || !productType) {
      throw new BadRequestException('Brand or product type not found');
    }

    // Get brand code (first 3 letters, uppercase, remove spaces)
    const brandCode = brand.name
      .substring(0, 3)
      .toUpperCase()
      .replace(/\s/g, '')
      .replace(/[^\w]/g, '');

    // Get product type code (first 3 letters, uppercase, remove spaces)
    const typeCode = productType.name
      .substring(0, 3)
      .toUpperCase()
      .replace(/\s/g, '')
      .replace(/[^\w]/g, '');

    // Find the highest sequence number for this brand+type combination
    const existingProducts = await this.prisma.product.findMany({
      where: {
        brandId,
        productTypeId,
        sku: { startsWith: `${brandCode}-${typeCode}-` },
      },
      orderBy: { sku: 'desc' },
      take: 1,
    });

    let sequence = 1;
    if (existingProducts.length > 0) {
      const lastSku = existingProducts[0].sku;
      const match = lastSku.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    const generatedSku = `${brandCode}-${typeCode}-${sequence.toString().padStart(4, '0')}`;

    // Verify it's unique (in case of race condition)
    const existing = await this.prisma.product.findUnique({
      where: { sku: generatedSku },
    });

    if (existing) {
      // If collision, increment and try again
      return `${brandCode}-${typeCode}-${(sequence + 1).toString().padStart(4, '0')}`;
    }

    return generatedSku;
  }

  /**
   * Generate a unique SKU for a product variant
   */
  private async generateVariantSku(productSku: string, variantName: string): Promise<string> {
    // Extract variant identifier from name (e.g., "50ml" -> "50", "Red" -> "RED")
    const variantCode = variantName
      .replace(/[^\w\d]/g, '')
      .toUpperCase()
      .substring(0, 10);

    const baseSku = `${productSku}-${variantCode}`;

    // Check if this variant SKU already exists
    let sku = baseSku;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.productVariant.findUnique({
        where: { sku },
      });

      if (!existing) {
        return sku;
      }

      sku = `${baseSku}-${counter}`;
      counter++;
    }
  }

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
    includeInactive?: boolean | string;
    lang?: string;
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

    // Parse includeInactive as boolean if provided
    const includeInactive = query.includeInactive === 'true' || query.includeInactive === true;

    const where: any = {};
    
    // Only filter by isActive if includeInactive is not true
    if (!includeInactive) {
      where.isActive = true;
    }

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

    // Resolve language
    const language = await this.languageHelper.resolveLanguage(query.lang);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          brand: {
            include: {
              translations: true,
            },
          },
          productType: {
            include: {
              translations: true,
            },
          },
          categories: {
            include: {
              category: {
                include: {
                  translations: true,
                },
              },
            },
          },
          variants: {
            where: { isActive: true },
            orderBy: { price: 'asc' },
          },
          attributes: {
            include: {
              attribute: {
                include: {
                  translations: true,
                },
              },
            },
          },
          productImages: {
            orderBy: { order: 'asc' },
          },
          translations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Add URLs to product images, convert legacy images, and apply translations
    const bucket = this.storageService.getBucketName();
    const productsWithImageUrls = await Promise.all(
      products.map(async (product) => {
        const translated = await this.applyProductTranslations(product, language);
        
        // Apply translations to brand
        if (product.brand?.translations) {
          const brandTranslation = await this.languageHelper.getTranslationWithFallback(
            product.brand.translations,
            language,
            await this.languageHelper['languagesService'].getDefaultLanguage(),
            (t) => t,
          );
          if (brandTranslation) {
            translated.brand.name = brandTranslation.name || translated.brand.name;
            translated.brand.description = brandTranslation.description || translated.brand.description;
          }
          delete translated.brand.translations;
        }

        // Apply translations to categories
        if (translated.categories) {
          const defaultLang = await this.languageHelper.getDefaultLanguage();
          for (const pc of translated.categories) {
            if (pc.category?.translations) {
              const catTranslation = await this.languageHelper.getTranslationWithFallback(
                pc.category.translations,
                language,
                defaultLang,
                (t) => t,
              );
              if (catTranslation) {
                pc.category.name = catTranslation.name || pc.category.name;
                pc.category.description = catTranslation.description || pc.category.description;
              }
              delete pc.category.translations;
            }
          }
        }

        return {
          ...translated,
          images: this.convertLegacyImages(product.images),
          productImages: (product.productImages || []).map((image) => ({
            ...image,
            url: this.storageService.getPublicUrl(bucket, image.filepath),
          })),
        };
      }),
    );

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

  async findOne(slug: string, language?: string) {
    const resolvedLanguage = await this.languageHelper.resolveLanguage(language);
    
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        brand: {
          include: {
            translations: true,
          },
        },
        productType: {
          include: {
            translations: true,
          },
        },
        categories: {
          include: {
            category: {
              include: {
                translations: true,
              },
            },
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
        attributes: {
          include: {
            attribute: {
              include: {
                translations: true,
              },
            },
          },
        },
        productImages: {
          orderBy: { order: 'asc' },
        },
        translations: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    // Apply translations
    const translated = await this.applyProductTranslations(product, resolvedLanguage);
    
    // Apply translations to related entities
    const defaultLang = await this.languageHelper['languagesService'].getDefaultLanguage();
    
    if (translated.brand?.translations) {
      const brandTranslation = await this.languageHelper.getTranslationWithFallback(
        translated.brand.translations,
        resolvedLanguage,
        defaultLang,
        (t) => t,
      );
      if (brandTranslation) {
        translated.brand.name = brandTranslation.name || translated.brand.name;
        translated.brand.description = brandTranslation.description || translated.brand.description;
      }
      delete translated.brand.translations;
    }

    if (translated.categories) {
      for (const pc of translated.categories) {
        if (pc.category?.translations) {
          const catTranslation = await this.languageHelper.getTranslationWithFallback(
            pc.category.translations,
            resolvedLanguage,
            defaultLang,
            (t) => t,
          );
          if (catTranslation) {
            pc.category.name = catTranslation.name || pc.category.name;
            pc.category.description = catTranslation.description || pc.category.description;
          }
          delete pc.category.translations;
        }
      }
    }

    // Add URLs to product images and convert legacy images
    const bucket = this.storageService.getBucketName();
    const productWithImageUrls = {
      ...translated,
      images: this.convertLegacyImages(product.images),
      productImages: (product.productImages || []).map((image) => ({
        ...image,
        url: this.storageService.getPublicUrl(bucket, image.filepath),
      })),
    };

    return productWithImageUrls;
  }

  async findById(id: string, language?: string) {
    const resolvedLanguage = await this.languageHelper.resolveLanguage(language);
    
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: {
          include: {
            translations: true,
          },
        },
        productType: {
          include: {
            translations: true,
          },
        },
        categories: {
          include: {
            category: {
              include: {
                translations: true,
              },
            },
          },
        },
        variants: {
          orderBy: { price: 'asc' },
        },
        attributes: {
          include: {
            attribute: {
              include: {
                translations: true,
              },
            },
          },
        },
        productImages: {
          orderBy: { order: 'asc' },
        },
        translations: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Apply translations
    const translated = await this.applyProductTranslations(product, resolvedLanguage);
    
    // Apply translations to related entities
    const defaultLang = await this.languageHelper['languagesService'].getDefaultLanguage();
    
    if (translated.brand?.translations) {
      const brandTranslation = await this.languageHelper.getTranslationWithFallback(
        translated.brand.translations,
        resolvedLanguage,
        defaultLang,
        (t) => t,
      );
      if (brandTranslation) {
        translated.brand.name = brandTranslation.name || translated.brand.name;
        translated.brand.description = brandTranslation.description || translated.brand.description;
      }
      delete translated.brand.translations;
    }

    if (translated.categories) {
      for (const pc of translated.categories) {
        if (pc.category?.translations) {
          const catTranslation = await this.languageHelper.getTranslationWithFallback(
            pc.category.translations,
            resolvedLanguage,
            defaultLang,
            (t) => t,
          );
          if (catTranslation) {
            pc.category.name = catTranslation.name || pc.category.name;
            pc.category.description = catTranslation.description || pc.category.description;
          }
          delete pc.category.translations;
        }
      }
    }

    // Add URLs to product images and convert legacy images
    const bucket = this.storageService.getBucketName();
    const productWithImageUrls = {
      ...translated,
      images: this.convertLegacyImages(product.images),
      productImages: (product.productImages || []).map((image) => ({
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

    // Always auto-generate SKU (ignore any user input)
    const productSku = await this.generateProductSku(createProductDto.brandId, createProductDto.productTypeId);

    // Always auto-generate slug from product name (ignore any user input)
    const baseSlug = this.slugify(createProductDto.name);
    const productSlug = await this.generateUniqueSlug(baseSlug);

    // Create product with variants, categories, and attributes
    const { categoryIds, variants, attributes, ...productData } = createProductDto;

    // Always auto-generate variant SKUs (ignore any user input)
    const variantsWithSku = await Promise.all(
      variants.map(async (variant) => {
        const variantSku = await this.generateVariantSku(productSku, variant.name);
        return {
          ...variant,
          sku: variantSku,
        };
      }),
    );

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        sku: productSku,
        slug: productSlug,
        isActive: productData.isActive ?? true,
        isFeatured: productData.isFeatured ?? false,
        variants: {
          create: variantsWithSku.map((variant) => ({
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
      productImages: (product.productImages || []).map((image) => ({
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

    // Always auto-generate SKU (ignore any user input)
    // Only regenerate if brand or product type changed, otherwise keep existing
    let productSku = product.sku;
    if (updateProductDto.brandId && updateProductDto.brandId !== product.brandId) {
      productSku = await this.generateProductSku(updateProductDto.brandId, product.productTypeId);
    } else if (updateProductDto.productTypeId && updateProductDto.productTypeId !== product.productTypeId) {
      productSku = await this.generateProductSku(product.brandId, updateProductDto.productTypeId);
    }

    // Always auto-generate slug from product name (ignore any user input)
    // Regenerate if name changed, otherwise keep existing
    let productSlug = product.slug;
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const baseSlug = this.slugify(updateProductDto.name);
      productSlug = await this.generateUniqueSlug(baseSlug, id);
    }

    const { categoryIds, variants, attributes, ...productData } = updateProductDto;

    // Always auto-generate variant SKUs (ignore any user input)
    let variantsWithSku = variants;
    if (variants) {
      variantsWithSku = await Promise.all(
        variants.map(async (variant) => {
          const variantSku = await this.generateVariantSku(productSku, variant.name);
          return {
            ...variant,
            sku: variantSku,
          };
        }),
      );
    }

    // Update product
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        sku: productSku,
        slug: productSlug,
        ...(categoryIds && {
          categories: {
            deleteMany: {},
            create: categoryIds.map((categoryId) => ({
              categoryId,
            })),
          },
        }),
        ...(variantsWithSku && {
          variants: {
            deleteMany: {},
            create: variantsWithSku.map((variant) => ({
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
      productImages: (updatedProduct.productImages || []).map((image) => ({
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

  /**
   * Create or update product translation
   */
  async upsertTranslation(
    productId: string,
    language: string,
    translationData: {
      name: string;
      description?: string;
      shortDescription?: string;
      metaTitle?: string;
      metaDescription?: string;
    },
  ) {
    // Verify product exists
    await this.findById(productId);

    // Verify language exists
    const lang = await this.prisma.language.findUnique({
      where: { code: language },
    });

    if (!lang || !lang.isActive) {
      throw new BadRequestException(`Language ${language} is not active`);
    }

    return this.prisma.productTranslation.upsert({
      where: {
        productId_language: {
          productId,
          language,
        },
      },
      update: translationData,
      create: {
        productId,
        language,
        ...translationData,
      },
    });
  }

  /**
   * Get product translations
   */
  async getTranslations(productId: string) {
    return this.prisma.productTranslation.findMany({
      where: { productId },
      orderBy: { language: 'asc' },
    });
  }

  /**
   * Delete product translation
   */
  async deleteTranslation(productId: string, language: string) {
    return this.prisma.productTranslation.delete({
      where: {
        productId_language: {
          productId,
          language,
        },
      },
    });
  }
}
