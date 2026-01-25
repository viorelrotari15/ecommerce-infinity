import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutEstimateDto, CreateCheckoutDto } from './dto/checkout.dto';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post('estimate')
  @ApiOperation({ summary: 'Estimate totals and shipping options' })
  estimate(@Body() dto: CheckoutEstimateDto) {
    return this.checkoutService.estimate(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create guest order' })
  create(@Body() dto: CreateCheckoutDto) {
    return this.checkoutService.create(dto);
  }
}
