import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AttributesService } from './attributes.service';

@ApiTags('attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private attributesService: AttributesService) {}

  @Get('product-type/:productTypeId')
  @ApiOperation({ summary: 'Get attributes by product type' })
  findByProductType(@Param('productTypeId') productTypeId: string) {
    return this.attributesService.findByProductType(productTypeId);
  }
}

