import { Controller, Get, Query } from '@nestjs/common';
import { PricingAdminService } from './pricing-admin.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingAdminService: PricingAdminService) {}

  @Get('shipping-options')
  async listShippingOptions(@Query('regionCode') regionCode?: string) {
    return this.pricingAdminService.listPublicShippingOptions(regionCode);
  }
}
