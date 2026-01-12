import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LanguageHelperService } from '../languages/language-helper.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
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
      const existing = await this.prisma.category.findUnique({
        where: { slug },
      });

      // If no existing category, or it's the same category being updated
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      // If slug exists, append counter
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Apply translations to category recursively
   */
  private async applyCategoryTranslations(category: any, language: string, defaultLang: string) {
    const translation = await this.languageHelper.getTranslationWithFallback(
      category.translations || [],
      language,
      defaultLang,
      (t) => t,
    );

    if (translation) {
      category.name = translation.name || category.name;
      category.description = translation.description || category.description;
    }

    delete category.translations;

    // Recursively apply to children
    if (category.children && Array.isArray(category.children)) {
      for (const child of category.children) {
        await this.applyCategoryTranslations(child, language, defaultLang);
      }
    }

    return category;
  }

  async findAll(language?: string) {
    const resolvedLanguage = await this.languageHelper.resolveLanguage(language);
    const defaultLang = await this.languageHelper.getDefaultLanguage();

    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                translations: true,
              },
            },
            translations: true,
          },
        },
        translations: true,
      },
      orderBy: { name: 'asc' },
    });

    // Apply translations recursively
    const translated = await Promise.all(
      categories.map((cat) => this.applyCategoryTranslations(cat, resolvedLanguage, defaultLang)),
    );

    return translated;
  }

  async findOne(slug: string, language?: string) {
    const resolvedLanguage = await this.languageHelper.resolveLanguage(language);
    const defaultLang = await this.languageHelper.getDefaultLanguage();

    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          include: {
            translations: true,
          },
        },
        children: {
          include: {
            translations: true,
          },
        },
        products: {
          include: {
            product: {
              include: {
                brand: {
                  include: {
                    translations: true,
                  },
                },
                translations: true,
                variants: {
                  where: { isActive: true },
                  take: 1,
                },
              },
            },
          },
          take: 20,
        },
        translations: true,
      },
    });

    if (!category) {
      return null;
    }

    // Apply translations
    const translated = await this.applyCategoryTranslations(category, resolvedLanguage, defaultLang);

    // Apply translations to parent
    if (translated.parent?.translations) {
      const parentTranslation = await this.languageHelper.getTranslationWithFallback(
        translated.parent.translations,
        resolvedLanguage,
        defaultLang,
        (t) => t,
      );
      if (parentTranslation) {
        translated.parent.name = parentTranslation.name || translated.parent.name;
        translated.parent.description = parentTranslation.description || translated.parent.description;
      }
      delete translated.parent.translations;
    }

    // Apply translations to products
    if (translated.products) {
      for (const pc of translated.products) {
        if (pc.product?.translations) {
          const productTranslation = await this.languageHelper.getTranslationWithFallback(
            pc.product.translations,
            resolvedLanguage,
            defaultLang,
            (t) => t,
          );
          if (productTranslation) {
            pc.product.name = productTranslation.name || pc.product.name;
            pc.product.description = productTranslation.description || pc.product.description;
            pc.product.shortDescription = productTranslation.shortDescription || pc.product.shortDescription;
          }
          delete pc.product.translations;
        }

        if (pc.product?.brand?.translations) {
          const brandTranslation = await this.languageHelper.getTranslationWithFallback(
            pc.product.brand.translations,
            resolvedLanguage,
            defaultLang,
            (t) => t,
          );
          if (brandTranslation) {
            pc.product.brand.name = brandTranslation.name || pc.product.brand.name;
            pc.product.brand.description = brandTranslation.description || pc.product.brand.description;
          }
          delete pc.product.brand.translations;
        }
      }
    }

    return translated;
  }

  async create(createCategoryDto: CreateCategoryDto) {
    // Validate parent if provided
    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${createCategoryDto.parentId} not found`);
      }
    }

    // Generate unique slug
    const baseSlug = this.slugify(createCategoryDto.name);
    const slug = await this.generateUniqueSlug(baseSlug);

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug,
        description: createCategoryDto.description,
        parentId: createCategoryDto.parentId,
      },
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Prevent circular reference: category cannot be its own parent
    if (updateCategoryDto.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    // Validate parent if being updated
    if (updateCategoryDto.parentId && updateCategoryDto.parentId !== category.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent category with ID ${updateCategoryDto.parentId} not found`);
      }

      // Check for circular reference: ensure parent is not a descendant
      const isDescendant = await this.isDescendant(id, updateCategoryDto.parentId);
      if (isDescendant) {
        throw new BadRequestException('Cannot set parent: would create circular reference');
      }
    }

    // If name is being updated, regenerate slug
    let slug = category.slug;
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const baseSlug = this.slugify(updateCategoryDto.name);
      slug = await this.generateUniqueSlug(baseSlug, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        slug,
      },
    });
  }

  /**
   * Check if a category is a descendant of another category
   */
  private async isDescendant(categoryId: string, potentialAncestorId: string): Promise<boolean> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { parent: true },
    });

    if (!category || !category.parent) {
      return false;
    }

    if (category.parent.id === potentialAncestorId) {
      return true;
    }

    return this.isDescendant(category.parent.id, potentialAncestorId);
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          take: 1,
        },
        products: {
          take: 1,
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has children
    if (category.children.length > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it has subcategories`,
      );
    }

    // Check if category has products
    if (category.products.length > 0) {
      throw new ConflictException(
        `Cannot delete category "${category.name}" because it has associated products`,
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }
}

