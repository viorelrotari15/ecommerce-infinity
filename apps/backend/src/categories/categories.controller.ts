import { Controller, Get, Post, Patch, Delete, Param, Req, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryTranslationDto } from './dto/create-category-translation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LANGUAGE_HEADER } from '../languages/interceptors/language.interceptor';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories (tree structure)' })
  findAll(@Req() req: Request) {
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.categoriesService.findAll(language);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category by ID (Admin only)' })
  findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  findOne(@Param('slug') slug: string, @Req() req: Request) {
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.categoriesService.findOne(slug, language);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Get(':id/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category translations (Admin only)' })
  getTranslations(@Param('id') id: string) {
    return this.categoriesService.getTranslations(id);
  }

  @Post(':id/translations/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update category translation (Admin only)' })
  upsertTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
    @Body() translationData: CreateCategoryTranslationDto,
  ) {
    return this.categoriesService.upsertTranslation(id, language, translationData);
  }

  @Delete(':id/translations/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category translation (Admin only)' })
  deleteTranslation(@Param('id') id: string, @Param('language') language: string) {
    return this.categoriesService.deleteTranslation(id, language);
  }
}

