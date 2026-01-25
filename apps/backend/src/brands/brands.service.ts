import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LanguageHelperService } from '../languages/language-helper.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private languageHelper: LanguageHelperService,
  ) {}

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
      const existing = await this.prisma.brand.findUnique({
        where: { slug },
      });

      // If no existing brand, or it's the same brand being updated
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      // If slug exists, append counter
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async findAll(language?: string) {
    const resolvedLanguage = await this.languageHelper.resolveLanguage(language);
    const defaultLang = await this.languageHelper.getDefaultLanguage();

    const brands = await this.prisma.brand.findMany({
      include: {
        translations: true,
      },
      orderBy: { name: 'asc' },
    });

    // Apply translations
    const translated = await Promise.all(
      brands.map(async (brand) => {
        const translation = await this.languageHelper.getTranslationWithFallback(
          brand.translations || [],
          resolvedLanguage,
          defaultLang,
          (t) => t,
        );

        if (translation) {
          brand.name = translation.name || brand.name;
          brand.description = translation.description || brand.description;
        }

        delete brand.translations;
        return brand;
      }),
    );

    return translated;
  }

  async findOne(slug: string, language?: string) {
    const resolvedLanguage = await this.languageHelper.resolveLanguage(language);
    const defaultLang = await this.languageHelper.getDefaultLanguage();

    const brand = await this.prisma.brand.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          include: {
            translations: true,
          },
          take: 10,
        },
        translations: true,
      },
    });

    if (!brand) {
      return null;
    }

    // Apply translations to brand
    const translation = await this.languageHelper.getTranslationWithFallback(
      brand.translations || [],
      resolvedLanguage,
      defaultLang,
      (t) => t,
    );

    if (translation) {
      brand.name = translation.name || brand.name;
      brand.description = translation.description || brand.description;
    }

    delete brand.translations;

    // Apply translations to products
    if (brand.products) {
      for (const product of brand.products) {
        if (product.translations) {
          const productTranslation = await this.languageHelper.getTranslationWithFallback(
            product.translations,
            resolvedLanguage,
            defaultLang,
            (t) => t,
          );
          if (productTranslation) {
            product.name = productTranslation.name || product.name;
            product.description = productTranslation.description || product.description;
            product.shortDescription = productTranslation.shortDescription || product.shortDescription;
          }
          delete product.translations;
        }
      }
    }

    return brand;
  }

  async create(createBrandDto: CreateBrandDto) {
    // Check if brand with same name already exists
    const existingBrand = await this.prisma.brand.findUnique({
      where: { name: createBrandDto.name },
    });

    if (existingBrand) {
      throw new ConflictException(`Brand with name "${createBrandDto.name}" already exists`);
    }

    // Generate unique slug
    const baseSlug = this.slugify(createBrandDto.name);
    const slug = await this.generateUniqueSlug(baseSlug);

    return this.prisma.brand.create({
      data: {
        name: createBrandDto.name,
        slug,
        description: createBrandDto.description,
      },
    });
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    // If name is being updated, check for conflicts and regenerate slug
    let slug = brand.slug;
    if (updateBrandDto.name && updateBrandDto.name !== brand.name) {
      const existingBrand = await this.prisma.brand.findUnique({
        where: { name: updateBrandDto.name },
      });

      if (existingBrand && existingBrand.id !== id) {
        throw new ConflictException(`Brand with name "${updateBrandDto.name}" already exists`);
      }

      const baseSlug = this.slugify(updateBrandDto.name);
      slug = await this.generateUniqueSlug(baseSlug, id);
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        ...updateBrandDto,
        slug,
      },
    });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        products: {
          take: 1,
        },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    // Check if brand has products
    if (brand.products.length > 0) {
      throw new ConflictException(
        `Cannot delete brand "${brand.name}" because it has associated products`,
      );
    }

    return this.prisma.brand.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return brand;
  }

  async getTranslations(brandId: string) {
    const brand = await this.findById(brandId);
    return this.prisma.brandTranslation.findMany({
      where: { brandId },
      orderBy: { language: 'asc' },
    });
  }

  async upsertTranslation(
    brandId: string,
    language: string,
    translationData: { name: string; description?: string },
  ) {
    // Verify brand exists
    await this.findById(brandId);

    // Verify language exists
    const lang = await this.prisma.language.findUnique({
      where: { code: language },
    });

    if (!lang || !lang.isActive) {
      throw new BadRequestException(`Language ${language} is not active`);
    }

    return this.prisma.brandTranslation.upsert({
      where: {
        brandId_language: {
          brandId,
          language,
        },
      },
      create: {
        brandId,
        language,
        name: translationData.name,
        description: translationData.description,
      },
      update: {
        name: translationData.name,
        description: translationData.description,
      },
    });
  }

  async deleteTranslation(brandId: string, language: string) {
    // Verify brand exists
    await this.findById(brandId);

    return this.prisma.brandTranslation.delete({
      where: {
        brandId_language: {
          brandId,
          language,
        },
      },
    });
  }
}

