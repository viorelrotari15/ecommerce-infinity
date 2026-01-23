import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LanguageHelperService } from '../languages/language-helper.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeTranslationDto } from './dto/create-attribute-translation.dto';

@Injectable()
export class AttributesService {
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
  private async generateUniqueSlug(
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.attribute.findUnique({
        where: {
          slug,
        },
      });

      // If no existing attribute, or it's the same attribute being updated
      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      // If slug exists, append counter
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async findAll(productTypeId?: string, language?: string) {
    const resolvedLanguage = await this.languageHelper.resolveLanguage(language);
    const defaultLang = await this.languageHelper.getDefaultLanguage();

    // If productTypeId is provided, return both:
    // 1. Attributes specific to this product type (productTypeId matches)
    // 2. Shared attributes (productTypeId is null)
    // If no productTypeId, return all attributes
    const where = productTypeId 
      ? {
          OR: [
            { productTypeId },
            { productTypeId: null },
          ],
        }
      : {};

    const attributes = await this.prisma.attribute.findMany({
      where,
      include: {
        translations: true,
        subattributes: {
          include: {
            translations: true,
          },
          orderBy: { name: 'asc' },
        },
        parent: true,
      },
      orderBy: { name: 'asc' },
    });

    // Apply translations
    const translated = await Promise.all(
      attributes.map(async (attribute) => {
        const translation = await this.languageHelper.getTranslationWithFallback(
          attribute.translations || [],
          resolvedLanguage,
          defaultLang,
          (t) => t,
        );

        if (translation) {
          attribute.name = translation.name || attribute.name;
        }

        delete attribute.translations;

        // Apply translations to subattributes
        if (attribute.subattributes) {
          for (const subattr of attribute.subattributes) {
            const subTranslation = await this.languageHelper.getTranslationWithFallback(
              subattr.translations || [],
              resolvedLanguage,
              defaultLang,
              (t) => t,
            );
            if (subTranslation) {
              subattr.name = subTranslation.name || subattr.name;
            }
            delete subattr.translations;
          }
        }

        return attribute;
      }),
    );

    return translated;
  }

  async findByProductType(productTypeId: string, language?: string) {
    return this.findAll(productTypeId, language);
  }

  async findById(id: string, language?: string) {
    const resolvedLanguage = await this.languageHelper.resolveLanguage(language);
    const defaultLang = await this.languageHelper.getDefaultLanguage();

    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: {
        translations: true,
        subattributes: {
          include: {
            translations: true,
          },
          orderBy: { name: 'asc' },
        },
        parent: true,
        productType: true,
      },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    // Apply translations
    const translation = await this.languageHelper.getTranslationWithFallback(
      attribute.translations || [],
      resolvedLanguage,
      defaultLang,
      (t) => t,
    );

    if (translation) {
      attribute.name = translation.name || attribute.name;
    }

    delete attribute.translations;

    // Apply translations to subattributes
    if (attribute.subattributes) {
      for (const subattr of attribute.subattributes) {
        const subTranslation = await this.languageHelper.getTranslationWithFallback(
          subattr.translations || [],
          resolvedLanguage,
          defaultLang,
          (t) => t,
        );
        if (subTranslation) {
          subattr.name = subTranslation.name || subattr.name;
        }
        delete subattr.translations;
      }
    }

    return attribute;
  }

  async create(createAttributeDto: CreateAttributeDto) {
    // Verify product type exists if provided
    if (createAttributeDto.productTypeId) {
      const productType = await this.prisma.productType.findUnique({
        where: { id: createAttributeDto.productTypeId },
      });

      if (!productType) {
        throw new NotFoundException(
          `Product type with ID ${createAttributeDto.productTypeId} not found`,
        );
      }
    }

    // If parentId is provided, verify parent exists
    if (createAttributeDto.parentId) {
      const parent = await this.prisma.attribute.findUnique({
        where: { id: createAttributeDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent attribute with ID ${createAttributeDto.parentId} not found`,
        );
      }

      // Ensure parent is a top-level attribute (not a subattribute)
      if (parent.parentId) {
        throw new ConflictException(
          'Cannot create a subattribute of a subattribute. Only top-level attributes can have subattributes.',
        );
      }
    }

    // Generate unique slug
    const baseSlug = this.slugify(createAttributeDto.name);
    const slug = await this.generateUniqueSlug(baseSlug);

    return this.prisma.attribute.create({
      data: {
        name: createAttributeDto.name,
        slug,
        productTypeId: createAttributeDto.productTypeId || null,
        parentId: createAttributeDto.parentId,
      },
      include: {
        subattributes: true,
        parent: true,
        productType: true,
      },
    });
  }

  async update(id: string, updateAttributeDto: UpdateAttributeDto) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    // If parentId is being updated, verify it exists
    if (updateAttributeDto.parentId !== undefined) {
      if (updateAttributeDto.parentId === id) {
        throw new ConflictException('Attribute cannot be its own parent');
      }

      if (updateAttributeDto.parentId) {
        const parent = await this.prisma.attribute.findUnique({
          where: { id: updateAttributeDto.parentId },
        });

        if (!parent) {
          throw new NotFoundException(
            `Parent attribute with ID ${updateAttributeDto.parentId} not found`,
          );
        }

        // Ensure parent is a top-level attribute (not a subattribute)
        if (parent.parentId) {
          throw new ConflictException(
            'Cannot create a subattribute of a subattribute. Only top-level attributes can have subattributes.',
          );
        }

        // Check for circular references
        let current = parent;
        while (current.parentId) {
          if (current.parentId === id) {
            throw new ConflictException(
              'Cannot create circular reference in attribute hierarchy',
            );
          }
          current = await this.prisma.attribute.findUnique({
            where: { id: current.parentId },
          });
          if (!current) break;
        }
      }
    }

    // If name is being updated, regenerate slug
    let slug = attribute.slug;
    if (updateAttributeDto.name && updateAttributeDto.name !== attribute.name) {
      const baseSlug = this.slugify(updateAttributeDto.name);
      slug = await this.generateUniqueSlug(baseSlug, id);
    }

    return this.prisma.attribute.update({
      where: { id },
      data: {
        ...updateAttributeDto,
        slug,
      },
      include: {
        subattributes: true,
        parent: true,
        productType: true,
      },
    });
  }

  async remove(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: {
        values: {
          take: 1,
        },
        subattributes: {
          take: 1,
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    // Check if attribute has product values
    if (attribute.values.length > 0) {
      throw new ConflictException(
        `Cannot delete attribute "${attribute.name}" because it has associated product values`,
      );
    }

    // Check if attribute has subattributes
    if (attribute.subattributes.length > 0) {
      throw new ConflictException(
        `Cannot delete attribute "${attribute.name}" because it has subattributes. Please delete subattributes first.`,
      );
    }

    return this.prisma.attribute.delete({
      where: { id },
    });
  }

  async getTranslations(attributeId: string) {
    const attribute = await this.findById(attributeId);
    return this.prisma.attributeTranslation.findMany({
      where: { attributeId },
      orderBy: { language: 'asc' },
    });
  }

  async upsertTranslation(
    attributeId: string,
    language: string,
    translationData: CreateAttributeTranslationDto,
  ) {
    // Verify attribute exists
    await this.findById(attributeId);

    // Verify language exists
    const lang = await this.prisma.language.findUnique({
      where: { code: language },
    });

    if (!lang) {
      throw new NotFoundException(`Language with code ${language} not found`);
    }

    return this.prisma.attributeTranslation.upsert({
      where: {
        attributeId_language: {
          attributeId,
          language,
        },
      },
      create: {
        attributeId,
        language,
        name: translationData.name,
      },
      update: {
        name: translationData.name,
      },
    });
  }

  async deleteTranslation(attributeId: string, language: string) {
    // Verify attribute exists
    await this.findById(attributeId);

    return this.prisma.attributeTranslation.delete({
      where: {
        attributeId_language: {
          attributeId,
          language,
        },
      },
    });
  }
}
