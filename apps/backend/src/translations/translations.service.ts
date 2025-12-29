import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { BulkTranslationsDto } from './dto/bulk-translations.dto';
import { LanguagesService } from '../languages/languages.service';

@Injectable()
export class TranslationsService {
  constructor(
    private prisma: PrismaService,
    private languagesService: LanguagesService,
  ) {}

  /**
   * Get all translations for a language
   * Returns as nested object structure
   */
  async getTranslations(language: string): Promise<Record<string, any>> {
    // Verify language exists and is active
    const lang = await this.prisma.language.findUnique({
      where: { code: language },
    });

    if (!lang || !lang.isActive) {
      // Fallback to default language
      const defaultLang = await this.languagesService.getDefaultLanguage();
      return this.getTranslations(defaultLang);
    }

    const translations = await this.prisma.uiTranslation.findMany({
      where: { language },
    });

    // Convert flat key-value to nested object
    const result: Record<string, any> = {};
    for (const t of translations) {
      const keys = t.key.split('.');
      let current = result;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = t.value;
    }

    return result;
  }

  /**
   * Get translation by key and language
   */
  async getTranslation(key: string, language: string): Promise<string | null> {
    const translation = await this.prisma.uiTranslation.findUnique({
      where: {
        key_language: {
          key,
          language,
        },
      },
    });

    if (!translation) {
      // Try fallback to default language
      const defaultLang = await this.languagesService.getDefaultLanguage();
      if (language !== defaultLang) {
        return this.getTranslation(key, defaultLang);
      }
      return null;
    }

    return translation.value;
  }

  /**
   * Get all translation keys (for admin)
   */
  async getAllKeys(): Promise<string[]> {
    const translations = await this.prisma.uiTranslation.findMany({
      select: { key: true },
      distinct: ['key'],
    });
    return translations.map((t) => t.key).sort();
  }

  /**
   * Get all translations grouped by key (for admin)
   */
  async getAllTranslations(): Promise<Array<{ key: string; translations: Array<{ language: string; value: string }> }>> {
    const all = await this.prisma.uiTranslation.findMany({
      orderBy: [{ key: 'asc' }, { language: 'asc' }],
    });

    const grouped = new Map<string, Array<{ language: string; value: string }>>();
    for (const t of all) {
      if (!grouped.has(t.key)) {
        grouped.set(t.key, []);
      }
      grouped.get(t.key)!.push({
        language: t.language,
        value: t.value,
      });
    }

    return Array.from(grouped.entries()).map(([key, translations]) => ({
      key,
      translations,
    }));
  }

  /**
   * Create or update a translation
   */
  async upsert(createTranslationDto: CreateTranslationDto) {
    // Verify language exists
    await this.prisma.language.findUniqueOrThrow({
      where: { code: createTranslationDto.language },
    });

    return this.prisma.uiTranslation.upsert({
      where: {
        key_language: {
          key: createTranslationDto.key,
          language: createTranslationDto.language,
        },
      },
      update: {
        value: createTranslationDto.value,
      },
      create: {
        key: createTranslationDto.key,
        language: createTranslationDto.language,
        value: createTranslationDto.value,
      },
    });
  }

  /**
   * Update a translation
   */
  async update(key: string, language: string, updateTranslationDto: UpdateTranslationDto) {
    const translation = await this.prisma.uiTranslation.findUnique({
      where: {
        key_language: {
          key,
          language,
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(`Translation not found for key ${key} and language ${language}`);
    }

    return this.prisma.uiTranslation.update({
      where: {
        key_language: {
          key,
          language,
        },
      },
      data: {
        value: updateTranslationDto.value!,
      },
    });
  }

  /**
   * Delete a translation
   */
  async remove(key: string, language: string) {
    return this.prisma.uiTranslation.delete({
      where: {
        key_language: {
          key,
          language,
        },
      },
    });
  }

  /**
   * Bulk upsert translations for a language
   */
  async bulkUpsert(bulkTranslationsDto: BulkTranslationsDto) {
    // Verify language exists
    await this.prisma.language.findUniqueOrThrow({
      where: { code: bulkTranslationsDto.language },
    });

    const operations = Object.entries(bulkTranslationsDto.translations).map(([key, value]) =>
      this.prisma.uiTranslation.upsert({
        where: {
          key_language: {
            key,
            language: bulkTranslationsDto.language,
          },
        },
        update: { value },
        create: {
          key,
          language: bulkTranslationsDto.language,
          value,
        },
      }),
    );

    await Promise.all(operations);
    return { success: true, count: operations.length };
  }
}

