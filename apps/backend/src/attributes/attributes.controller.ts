import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AttributesService } from './attributes.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { CreateAttributeTranslationDto } from './dto/create-attribute-translation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LANGUAGE_HEADER } from '../languages/interceptors/language.interceptor';

@ApiTags('attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private attributesService: AttributesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all attributes' })
  findAll(@Req() req?: Request) {
    const language = req?.headers[LANGUAGE_HEADER] as string | undefined;
    return this.attributesService.findAll(language);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get attribute by ID' })
  findById(@Param('id') id: string, @Req() req?: Request) {
    const language = req?.headers[LANGUAGE_HEADER] as string | undefined;
    return this.attributesService.findById(id, language);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new attribute (Admin only)' })
  create(@Body() createAttributeDto: CreateAttributeDto) {
    return this.attributesService.create(createAttributeDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an attribute (Admin only)' })
  update(@Param('id') id: string, @Body() updateAttributeDto: UpdateAttributeDto) {
    return this.attributesService.update(id, updateAttributeDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an attribute (Admin only)' })
  remove(@Param('id') id: string) {
    return this.attributesService.remove(id);
  }

  @Get(':id/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attribute translations (Admin only)' })
  getTranslations(@Param('id') id: string) {
    return this.attributesService.getTranslations(id);
  }

  @Post(':id/translations/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update attribute translation (Admin only)' })
  upsertTranslation(
    @Param('id') id: string,
    @Param('language') language: string,
    @Body() translationData: CreateAttributeTranslationDto,
  ) {
    return this.attributesService.upsertTranslation(id, language, translationData);
  }

  @Delete(':id/translations/:language')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete attribute translation (Admin only)' })
  deleteTranslation(@Param('id') id: string, @Param('language') language: string) {
    return this.attributesService.deleteTranslation(id, language);
  }
}
