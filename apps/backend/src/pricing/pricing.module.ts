import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxCalculatorService } from './tax-calculator.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { PricingAdminController } from './pricing-admin.controller';
import { PricingController } from './pricing.controller';
import { PricingAdminService } from './pricing-admin.service';

@Module({
  imports: [PrismaModule],
  controllers: [PricingAdminController, PricingController],
  providers: [TaxCalculatorService, ShippingCalculatorService, PricingAdminService],
  exports: [TaxCalculatorService, ShippingCalculatorService],
})
export class PricingModule {}
