import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductTypesService } from './product-types.service';

@ApiTags('product-types')
@Controller('product-types')
export class ProductTypesController {
  constructor(private productTypesService: ProductTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all product types' })
  findAll() {
    return this.productTypesService.findAll();
  }
}

