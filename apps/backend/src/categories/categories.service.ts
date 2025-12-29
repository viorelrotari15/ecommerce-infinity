import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LanguageHelperService } from '../languages/language-helper.service';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private languageHelper: LanguageHelperService,
  ) {}

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
}

