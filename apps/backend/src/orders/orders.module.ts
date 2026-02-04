import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PricingModule } from '../pricing/pricing.module';
import { MetricsModule } from '../metrics/metrics.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PricingModule, MetricsModule, EmailModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

