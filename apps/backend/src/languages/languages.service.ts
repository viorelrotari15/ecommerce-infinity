import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all active languages
   */
  async findAll(includeInactive = false) {
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
   */
  async getDefaultLanguage(): Promise<string> {
    const defaultLang = await this.prisma.language.findFirst({
      where: { isDefault: true, isActive: true },
    });
    
    if (!defaultLang) {
      // Fallback to 'en' if no default set
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

