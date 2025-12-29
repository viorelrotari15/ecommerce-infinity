import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TranslationsService } from './translations.service';
import { LanguagesService } from '../languages/languages.service';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { BulkTranslationsDto } from './dto/bulk-translations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('translations')
export class TranslationsController {
  constructor(
    private readonly translationsService: TranslationsService,
    private readonly languagesService: LanguagesService,
  ) {}

  /**
   * Public endpoint: Get translations for a language
   */
  @Get()
  async getTranslations(@Query('lang') lang?: string) {
    const language = lang || (await this.languagesService.getDefaultLanguage());
    return this.translationsService.getTranslations(language);
  }

  /**
   * Admin endpoint: Get all translation keys
   */
  @Get('keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllKeys() {
    return this.translationsService.getAllKeys();
  }

  /**
   * Admin endpoint: Get all translations grouped by key
   */
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllTranslations() {
    return this.translationsService.getAllTranslations();
  }

  /**
   * Admin endpoint: Create or update translation
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  upsert(@Body() createTranslationDto: CreateTranslationDto) {
    return this.translationsService.upsert(createTranslationDto);
  }

  /**
   * Admin endpoint: Bulk upsert translations
   */
  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  bulkUpsert(@Body() bulkTranslationsDto: BulkTranslationsDto) {
    return this.translationsService.bulkUpsert(bulkTranslationsDto);
  }

  /**
   * Admin endpoint: Update translation
   */
  @Patch(':key/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('key') key: string,
    @Param('language') language: string,
    @Body() updateTranslationDto: UpdateTranslationDto,
  ) {
    return this.translationsService.update(key, language, updateTranslationDto);
  }

  /**
   * Admin endpoint: Delete translation
   */
  @Delete(':key/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('key') key: string, @Param('language') language: string) {
    return this.translationsService.remove(key, language);
  }
}

