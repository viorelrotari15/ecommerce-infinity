import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { CreateProductTypeTranslationDto } from './dto/create-product-type-translation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LANGUAGE_HEADER } from '../languages/interceptors/language.interceptor';

@ApiTags('product-types')
@Controller('product-types')
export class ProductTypesController {
  constructor(private productTypesService: ProductTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all product types' })
  findAll(@Req() req: Request) {
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.productTypesService.findAll(language);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product type by ID (Admin only)' })
  findById(@Param('id') id: string) {
    return this.productTypesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product type (Admin only)' })
  create(@Body() createProductTypeDto: CreateProductTypeDto) {
    return this.productTypesService.create(createProductTypeDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product type (Admin only)' })
  update(@Param('id') id: string, @Body() updateProductTypeDto: UpdateProductTypeDto) {
    return this.productTypesService.update(id, updateProductTypeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product type (Admin only)' })
  remove(@Param('id') id: string) {
    return this.productTypesService.remove(id);
  }

  @Get(':id/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product type translations (Admin only)' })
  getTranslations(@Param('id') id: string) {
    return this.productTypesService.getTranslations(id);
  }

  @Post(':id/translations/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update product type translation (Admin only)' })
  upsertTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
    @Body() translationData: CreateProductTypeTranslationDto,
  ) {
    return this.productTypesService.upsertTranslation(id, language, translationData);
  }

  @Delete(':id/translations/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product type translation (Admin only)' })
  deleteTranslation(@Param('id') id: string, @Param('language') language: string) {
    return this.productTypesService.deleteTranslation(id, language);
  }
}

