import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  /**
   * Public endpoint: Get all active currencies
   */
  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.currenciesService.findAll(includeInactive === 'true');
  }

  /**
   * Public endpoint: Get default currency
   */
  @Get('default')
  async getDefault() {
    const code = await this.currenciesService.getDefaultCurrency();
    return { code };
  }

  /**
   * Admin endpoint: Get currency by code
   */
  @Get(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('code') code: string) {
    return this.currenciesService.findOne(code);
  }

  /**
   * Admin endpoint: Create currency
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() createCurrencyDto: CreateCurrencyDto) {
    return this.currenciesService.create(createCurrencyDto);
  }

  /**
   * Admin endpoint: Update currency
   */
  @Patch(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('code') code: string, @Body() updateCurrencyDto: UpdateCurrencyDto) {
    return this.currenciesService.update(code, updateCurrencyDto);
  }

  /**
   * Admin endpoint: Set default currency
   */
  @Post(':code/set-default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setDefault(@Param('code') code: string) {
    return this.currenciesService.setDefault(code);
  }

  /**
   * Admin endpoint: Delete currency
   */
  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('code') code: string) {
    return this.currenciesService.remove(code);
  }
}
