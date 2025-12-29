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
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  /**
   * Public endpoint: Get all active languages
   */
  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.languagesService.findAll(includeInactive === 'true');
  }

  /**
   * Public endpoint: Get default language
   */
  @Get('default')
  async getDefault() {
    const code = await this.languagesService.getDefaultLanguage();
    return { code };
  }

  /**
   * Admin endpoint: Get language by code
   */
  @Get(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('code') code: string) {
    return this.languagesService.findOne(code);
  }

  /**
   * Admin endpoint: Create language
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languagesService.create(createLanguageDto);
  }

  /**
   * Admin endpoint: Update language
   */
  @Patch(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('code') code: string, @Body() updateLanguageDto: UpdateLanguageDto) {
    return this.languagesService.update(code, updateLanguageDto);
  }

  /**
   * Admin endpoint: Set default language
   */
  @Post(':code/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setDefault(@Param('code') code: string) {
    return this.languagesService.setDefault(code);
  }

  /**
   * Admin endpoint: Delete language
   */
  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('code') code: string) {
    return this.languagesService.remove(code);
  }
}

