import { Controller, Get, Put, Delete, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  getCart(@Request() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update user cart' })
  updateCart(@Request() req, @Body() updateCartDto: UpdateCartDto) {
    return this.cartService.updateCart(req.user.id, updateCartDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear user cart' })
  clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }
}

