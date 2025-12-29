import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LANGUAGE_HEADER } from '../languages/interceptors/language.interceptor';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products with filters' })
  findAll(@Query() query: any, @Req() req: Request) {
    // Get language from header set by interceptor
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.productsService.findAll({ ...query, lang: language });
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get product by ID' })
  findById(@Param('id') id: string, @Req() req: Request) {
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.productsService.findById(id, language);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findOne(@Param('slug') slug: string, @Req() req: Request) {
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.productsService.findOne(slug, language);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (Admin only)' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product (Admin only)' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product (Admin only)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  /**
   * Get product translations
   */
  @Get(':id/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product translations (Admin only)' })
  getTranslations(@Param('id') id: string) {
    return this.productsService.getTranslations(id);
  }

  /**
   * Create or update product translation
   */
  @Post(':id/translations/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update product translation (Admin only)' })
  upsertTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
    @Body() translationData: {
      name: string;
      description?: string;
      shortDescription?: string;
      metaTitle?: string;
      metaDescription?: string;
    },
  ) {
    return this.productsService.upsertTranslation(id, language, translationData);
  }

  /**
   * Delete product translation
   */
  @Delete(':id/translations/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product translation (Admin only)' })
  deleteTranslation(@Param('id') id: string, @Param('language') language: string) {
    return this.productsService.deleteTranslation(id, language);
  }
}

