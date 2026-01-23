import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ensure English language exists in the database
   * This is called automatically to guarantee English is always available
   */
  private async ensureEnglishExists(): Promise<void> {
    const englishExists = await this.prisma.language.findUnique({
      where: { code: 'en' },
    });

    if (!englishExists) {
      // Check if there are any languages at all
      const languageCount = await this.prisma.language.count();
      const hasDefault = await this.prisma.language.findFirst({
        where: { isDefault: true },
      });

      // Create English as default if no languages exist or no default is set
      await this.prisma.language.create({
        data: {
          code: 'en',
          name: 'English',
          isDefault: languageCount === 0 || !hasDefault,
          isActive: true,
        },
      });
    } else if (!englishExists.isActive) {
      // If English exists but is inactive, activate it
      await this.prisma.language.update({
        where: { code: 'en' },
        data: { isActive: true },
      });
    }
  }

  /**
   * Get all active languages
   * Ensures English exists in the database before returning
   */
  async findAll(includeInactive = false) {
    // Ensure English exists in the database
    await this.ensureEnglishExists();

    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.language.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get default language from DB
   * Ensures English exists and is set as default if no default is configured
   */
  async getDefaultLanguage(): Promise<string> {
    // Ensure English exists in the database
    await this.ensureEnglishExists();

    const defaultLang = await this.prisma.language.findFirst({
      where: { isDefault: true, isActive: true },
    });
    
    if (!defaultLang) {
      // If no default is set, set English as default
      await this.prisma.language.update({
        where: { code: 'en' },
        data: { isDefault: true, isActive: true },
      });
      return 'en';
    }
    
    return defaultLang.code;
  }

  /**
   * Get language by code
   */
  async findOne(code: string) {
    const language = await this.prisma.language.findUnique({
      where: { code },
    });

    if (!language) {
      throw new NotFoundException(`Language with code ${code} not found`);
    }

    return language;
  }

  /**
   * Create a new language
   */
  async create(createLanguageDto: CreateLanguageDto) {
    // Check if language code already exists
    const existing = await this.prisma.language.findUnique({
      where: { code: createLanguageDto.code },
    });

    if (existing) {
      throw new ConflictException(`Language with code ${createLanguageDto.code} already exists`);
    }

    // If setting as default, unset other defaults
    if (createLanguageDto.isDefault) {
      await this.prisma.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.language.create({
      data: {
        code: createLanguageDto.code.toLowerCase(),
        name: createLanguageDto.name,
        isDefault: createLanguageDto.isDefault ?? false,
        isActive: createLanguageDto.isActive ?? true,
      },
    });
  }

  /**
   * Update a language
   */
  async update(code: string, updateLanguageDto: UpdateLanguageDto) {
    const language = await this.findOne(code);

    // Prevent deactivating English (always required)
    if (code.toLowerCase() === 'en' && updateLanguageDto.isActive === false) {
      throw new BadRequestException('Cannot deactivate English language. English is required and must remain active.');
    }

    // Prevent changing English code
    if (code.toLowerCase() === 'en' && updateLanguageDto.code && updateLanguageDto.code.toLowerCase() !== 'en') {
      throw new BadRequestException('Cannot change English language code. English code must remain "en".');
    }

    // If changing code, check if new code exists
    if (updateLanguageDto.code && updateLanguageDto.code !== code) {
      const existing = await this.prisma.language.findUnique({
        where: { code: updateLanguageDto.code },
      });

      if (existing) {
        throw new ConflictException(`Language with code ${updateLanguageDto.code} already exists`);
      }
    }

    // If setting as default, unset other defaults
    if (updateLanguageDto.isDefault) {
      await this.prisma.language.updateMany({
        where: { isDefault: true, code: { not: code } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (updateLanguageDto.code) updateData.code = updateLanguageDto.code.toLowerCase();
    if (updateLanguageDto.name) updateData.name = updateLanguageDto.name;
    if (updateLanguageDto.isDefault !== undefined) updateData.isDefault = updateLanguageDto.isDefault;
    if (updateLanguageDto.isActive !== undefined) updateData.isActive = updateLanguageDto.isActive;

    return this.prisma.language.update({
      where: { code },
      data: updateData,
    });
  }

  /**
   * Delete a language
   */
  async remove(code: string) {
    const language = await this.findOne(code);

    // Prevent deleting English (always required)
    if (code.toLowerCase() === 'en') {
      throw new BadRequestException('Cannot delete English language. English is required and cannot be removed.');
    }

    // Prevent deleting default language
    if (language.isDefault) {
      throw new BadRequestException('Cannot delete the default language');
    }

    // Check if it's the only active language
    const activeCount = await this.prisma.language.count({
      where: { isActive: true },
    });

    if (activeCount <= 1 && language.isActive) {
      throw new BadRequestException('Cannot delete the only active language');
    }

    return this.prisma.language.delete({
      where: { code },
    });
  }

  /**
   * Set default language
   */
  async setDefault(code: string) {
    await this.findOne(code); // Verify language exists

    // Unset all defaults
    await this.prisma.language.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.language.update({
      where: { code },
      data: { isDefault: true, isActive: true },
    });
  }
}

