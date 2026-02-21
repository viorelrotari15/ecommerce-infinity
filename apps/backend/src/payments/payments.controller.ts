import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { ConfirmPaymentSuccessDto } from './dto/confirm-payment-success.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { StripeHistoryQueryDto } from './dto/stripe-history.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('intent')
  @ApiOperation({ summary: 'Create Stripe payment intent for order' })
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Post('confirm-success')
  @ApiOperation({ summary: 'Confirm payment success (after client-side Stripe success)' })
  confirmSuccess(@Body() dto: ConfirmPaymentSuccessDto) {
    return this.paymentsService.confirmPaymentSuccess(dto.orderId);
  }

  @SkipThrottle()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook' })
  handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature?: string) {
    return this.paymentsService.handleStripeWebhook(req.body as Buffer, signature);
  }

  @Get('stripe/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe payment history (Admin)' })
  listStripePayments(@Query() query: StripeHistoryQueryDto) {
    return this.paymentsService.listStripePayments(query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('order/:orderId')
  @ApiOperation({ summary: 'Create payment for order' })
  create(@Param('orderId') orderId: string, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(orderId, createPaymentDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment by order ID' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }
}

