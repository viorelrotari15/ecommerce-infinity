import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingCalculatorService } from './shipping-calculator.service';
import { PricingAdminController } from './pricing-admin.controller';
import { PricingController } from './pricing.controller';
import { PricingAdminService } from './pricing-admin.service';

@Module({
  imports: [PrismaModule],
  controllers: [PricingAdminController, PricingController],
  providers: [ShippingCalculatorService, PricingAdminService],
  exports: [ShippingCalculatorService],
})
export class PricingModule {}
