import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Patch,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadImageDto } from './dto/upload-image.dto';

@ApiTags('images')
@Controller('images')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImagesController {
  constructor(private imagesService: ImagesService) {}

  @Post('products/:productId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Upload product image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    // Parse FormData values manually since they come as strings
    const isPrimary = body.isPrimary === 'true' || body.isPrimary === true;
    const order = body.order ? parseInt(body.order, 10) : undefined;

    return this.imagesService.uploadProductImage(productId, file, {
      isPrimary,
      order,
    });
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get all images for a product' })
  async getProductImages(@Param('productId') productId: string) {
    return this.imagesService.getProductImages(productId);
  }

  @Delete(':imageId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete product image (Admin only)' })
  async deleteProductImage(@Param('imageId') imageId: string) {
    return this.imagesService.deleteProductImage(imageId);
  }

  @Patch(':imageId/primary')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Set image as primary (Admin only)' })
  async setPrimaryImage(@Param('imageId') imageId: string) {
    return this.imagesService.setPrimaryImage(imageId);
  }

  @Patch('reorder')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reorder product images (Admin only)' })
  async reorderImages(@Query('ids') ids: string) {
    const imageIds = ids.split(',').filter((id) => id.trim());
    return this.imagesService.reorderImages(imageIds);
  }
}

