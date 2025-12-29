import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BrandsService } from './brands.service';
import { LANGUAGE_HEADER } from '../languages/interceptors/language.interceptor';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all brands' })
  findAll(@Req() req: Request) {
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.brandsService.findAll(language);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get brand by slug' })
  findOne(@Param('slug') slug: string, @Req() req: Request) {
    const language = req.headers[LANGUAGE_HEADER] as string | undefined;
    return this.brandsService.findOne(slug, language);
  }
}

