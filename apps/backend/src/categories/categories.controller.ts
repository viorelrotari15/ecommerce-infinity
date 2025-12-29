import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { CategoriesService } from './categories.service';
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

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  findOne(@Param('slug') slug: string, @Req() req: Request) {
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.categoriesService.findOne(slug, language);
  }
}

