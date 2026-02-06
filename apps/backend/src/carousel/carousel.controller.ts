import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CarouselService } from './carousel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCarouselSlideDto } from './dto/create-carousel-slide.dto';
import { UpdateCarouselSlideDto } from './dto/update-carousel-slide.dto';

@ApiTags('carousel')
@Controller('carousel')
export class CarouselController {
  constructor(private carouselService: CarouselService) {}

  @Get()
  @ApiOperation({ summary: 'Get carousel slides (public)' })
  async findAll() {
    return this.carouselService.findAll();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get carousel slides for admin' })
  async findAllAdmin() {
    return this.carouselService.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create carousel slide (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'fileDesktop', maxCount: 1 },
      { name: 'fileMobile', maxCount: 1 },
    ]),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        link: { type: 'string' },
        fileDesktop: { type: 'string', format: 'binary' },
        fileMobile: { type: 'string', format: 'binary' },
      },
    },
  })
  async create(
    @Body() dto: CreateCarouselSlideDto,
    @UploadedFiles()
    files: { fileDesktop?: Express.Multer.File[]; fileMobile?: Express.Multer.File[] },
  ) {
    const fileDesktop = files?.fileDesktop?.[0];
    const fileMobile = files?.fileMobile?.[0];
    return this.carouselService.create(dto, fileDesktop, fileMobile);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update carousel slide (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'fileDesktop', maxCount: 1 },
      { name: 'fileMobile', maxCount: 1 },
    ]),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        link: { type: 'string' },
        fileDesktop: { type: 'string', format: 'binary' },
        fileMobile: { type: 'string', format: 'binary' },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCarouselSlideDto,
    @UploadedFiles()
    files: { fileDesktop?: Express.Multer.File[]; fileMobile?: Express.Multer.File[] },
  ) {
    const fileDesktop = files?.fileDesktop?.[0];
    const fileMobile = files?.fileMobile?.[0];
    return this.carouselService.update(id, dto, fileDesktop, fileMobile);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete carousel slide (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.carouselService.remove(id);
  }
}
