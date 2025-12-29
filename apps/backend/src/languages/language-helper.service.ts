import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LanguagesService } from './languages.service';

@Injectable()
export class LanguageHelperService {
  constructor(
    private prisma: PrismaService,
    private languagesService: LanguagesService,
  ) {}

  /**
   * Get default language
   */
  async getDefaultLanguage(): Promise<string> {
    return this.languagesService.getDefaultLanguage();
  }

  /**
   * Resolve language from request or use default
   */
  async resolveLanguage(requestLanguage?: string): Promise<string> {
    if (!requestLanguage) {
      return this.getDefaultLanguage();
    }

    // Verify language exists and is active
    const lang = await this.prisma.language.findUnique({
      where: { code: requestLanguage },
    });

    if (!lang || !lang.isActive) {
      return this.getDefaultLanguage();
    }

    return requestLanguage;
  }

  /**
   * Get translation with fallback
   */
  async getTranslationWithFallback<T extends { language: string }>(
    translations: T[],
    language: string,
    defaultLanguage: string,
    getValue: (t: T) => any,
  ): Promise<any> {
    // Try requested language first
    const translation = translations.find((t) => t.language === language);
    if (translation) {
      return getValue(translation);
    }

    // Fallback to default language
    const defaultTranslation = translations.find((t) => t.language === defaultLanguage);
    if (defaultTranslation) {
      return getValue(defaultTranslation);
    }

    // Fallback to first available translation
    if (translations.length > 0) {
      return getValue(translations[0]);
    }

    // Last resort: return null
    return null;
  }
}

