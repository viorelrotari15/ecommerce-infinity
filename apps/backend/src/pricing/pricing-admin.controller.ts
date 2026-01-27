import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PricingAdminService } from './pricing-admin.service';
import { CreateTaxRateDto, UpdateTaxRateDto } from './dto/tax-rate.dto';
import { CreateShippingMethodDto, UpdateShippingMethodDto } from './dto/shipping-method.dto';
import { CreateShippingRuleDto, UpdateShippingRuleDto } from './dto/shipping-rule.dto';

@ApiTags('pricing-admin')
@Controller('pricing/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class PricingAdminController {
  constructor(private pricingAdminService: PricingAdminService) {}

  @Get('regions')
  @ApiOperation({ summary: 'List regions' })
  listRegions() {
    return this.pricingAdminService.listRegions();
  }

  @Get('tax-rates')
  @ApiOperation({ summary: 'List tax rates' })
  listTaxRates(@Query('regionCode') regionCode?: string) {
    return this.pricingAdminService.listTaxRates(regionCode);
  }

  @Post('tax-rates')
  @ApiOperation({ summary: 'Create tax rate' })
  createTaxRate(@Body() dto: CreateTaxRateDto) {
    return this.pricingAdminService.createTaxRate(dto);
  }

  @Patch('tax-rates/:id')
  @ApiOperation({ summary: 'Update tax rate' })
  updateTaxRate(@Param('id') id: string, @Body() dto: UpdateTaxRateDto) {
    return this.pricingAdminService.updateTaxRate(id, dto);
  }

  @Delete('tax-rates/:id')
  @ApiOperation({ summary: 'Delete tax rate' })
  deleteTaxRate(@Param('id') id: string) {
    return this.pricingAdminService.deleteTaxRate(id);
  }

  @Get('shipping-methods')
  @ApiOperation({ summary: 'List shipping methods' })
  listShippingMethods(@Query('regionCode') regionCode?: string) {
    return this.pricingAdminService.listShippingMethods(regionCode);
  }

  @Post('shipping-methods')
  @ApiOperation({ summary: 'Create shipping method' })
  createShippingMethod(@Body() dto: CreateShippingMethodDto) {
    return this.pricingAdminService.createShippingMethod(dto);
  }

  @Patch('shipping-methods/:id')
  @ApiOperation({ summary: 'Update shipping method' })
  updateShippingMethod(@Param('id') id: string, @Body() dto: UpdateShippingMethodDto) {
    return this.pricingAdminService.updateShippingMethod(id, dto);
  }

  @Delete('shipping-methods/:id')
  @ApiOperation({ summary: 'Delete shipping method' })
  deleteShippingMethod(@Param('id') id: string) {
    return this.pricingAdminService.deleteShippingMethod(id);
  }

  @Get('shipping-rules')
  @ApiOperation({ summary: 'List shipping rules' })
  listShippingRules(@Query('shippingMethodId') shippingMethodId?: string) {
    return this.pricingAdminService.listShippingRules(shippingMethodId);
  }

  @Post('shipping-rules')
  @ApiOperation({ summary: 'Create shipping rule' })
  createShippingRule(@Body() dto: CreateShippingRuleDto) {
    return this.pricingAdminService.createShippingRule(dto);
  }

  @Patch('shipping-rules/:id')
  @ApiOperation({ summary: 'Update shipping rule' })
  updateShippingRule(@Param('id') id: string, @Body() dto: UpdateShippingRuleDto) {
    return this.pricingAdminService.updateShippingRule(id, dto);
  }

  @Delete('shipping-rules/:id')
  @ApiOperation({ summary: 'Delete shipping rule' })
  deleteShippingRule(@Param('id') id: string) {
    return this.pricingAdminService.deleteShippingRule(id);
  }
}
