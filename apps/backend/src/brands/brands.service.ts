import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LanguageHelperService } from '../languages/language-helper.service';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private languageHelper: LanguageHelperService,
  ) {}

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
}

