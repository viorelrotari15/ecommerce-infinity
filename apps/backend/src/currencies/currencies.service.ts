import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all active currencies
   */
  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.currency.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get instance currency from database (isDefault: true) or env (single currency per instance)
   */
  async getInstanceCurrency(): Promise<string> {
    // First, check database for currency marked as default
    const defaultCurrency = await this.prisma.currency.findFirst({
      where: { isDefault: true, isActive: true },
    });
    
    if (defaultCurrency) {
      return defaultCurrency.code;
    }
    
    // Fallback to environment variable if no default is set in database
    const instanceCurrency = process.env.INSTANCE_CURRENCY_CODE || process.env.DEFAULT_CURRENCY_CODE || 'EUR';
    
    // Verify currency exists in database
    const currency = await this.prisma.currency.findUnique({
      where: { code: instanceCurrency.toUpperCase() },
    });
    
    if (!currency || !currency.isActive) {
      throw new Error(`Currency ${instanceCurrency} is not configured. Please add it to the database or set INSTANCE_CURRENCY_CODE environment variable.`);
    }
    
    return currency.code;
  }

  /**
   * Get default currency (alias for getInstanceCurrency for backward compatibility)
   */
  async getDefaultCurrency(): Promise<string> {
    return this.getInstanceCurrency();
  }

  /**
   * Get currency by code
   */
  async findOne(code: string) {
    const currency = await this.prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException(`Currency with code ${code} not found`);
    }

    return currency;
  }

  /**
   * Create a new currency
   */
  async create(createCurrencyDto: CreateCurrencyDto) {
    const code = createCurrencyDto.code.toUpperCase();
    
    // Check if currency code already exists
    const existing = await this.prisma.currency.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`Currency with code ${code} already exists`);
    }

    // If setting as default, unset other defaults
    if (createCurrencyDto.isDefault) {
      await this.prisma.currency.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.currency.create({
      data: {
        code,
        name: createCurrencyDto.name,
        symbol: createCurrencyDto.symbol,
        isDefault: createCurrencyDto.isDefault ?? false,
        isActive: createCurrencyDto.isActive ?? true,
      },
    });
  }

  /**
   * Update a currency
   */
  async update(code: string, updateCurrencyDto: UpdateCurrencyDto) {
    const currency = await this.findOne(code);

    // If changing code, check if new code exists
    if (updateCurrencyDto.code && updateCurrencyDto.code.toUpperCase() !== code.toUpperCase()) {
      const newCode = updateCurrencyDto.code.toUpperCase();
      const existing = await this.prisma.currency.findUnique({
        where: { code: newCode },
      });

      if (existing) {
        throw new ConflictException(`Currency with code ${newCode} already exists`);
      }
    }

    // If setting as default, unset other defaults
    if (updateCurrencyDto.isDefault) {
      await this.prisma.currency.updateMany({
        where: { isDefault: true, code: { not: code.toUpperCase() } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (updateCurrencyDto.code) updateData.code = updateCurrencyDto.code.toUpperCase();
    if (updateCurrencyDto.name) updateData.name = updateCurrencyDto.name;
    if (updateCurrencyDto.symbol) updateData.symbol = updateCurrencyDto.symbol;
    if (updateCurrencyDto.isDefault !== undefined) updateData.isDefault = updateCurrencyDto.isDefault;
    if (updateCurrencyDto.isActive !== undefined) updateData.isActive = updateCurrencyDto.isActive;

    return this.prisma.currency.update({
      where: { code: code.toUpperCase() },
      data: updateData,
    });
  }

  /**
   * Delete a currency
   */
  async remove(code: string) {
    const currency = await this.findOne(code);

    // Prevent deleting default currency
    if (currency.isDefault) {
      throw new BadRequestException('Cannot delete the default currency');
    }

    // Check if it's the only active currency
    const activeCount = await this.prisma.currency.count({
      where: { isActive: true },
    });

    if (activeCount <= 1 && currency.isActive) {
      throw new BadRequestException('Cannot delete the only active currency');
    }

    return this.prisma.currency.delete({
      where: { code: code.toUpperCase() },
    });
  }

  /**
   * Set default currency
   */
  async setDefault(code: string) {
    await this.findOne(code); // Verify currency exists

    // Unset all defaults
    await this.prisma.currency.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.currency.update({
      where: { code: code.toUpperCase() },
      data: { isDefault: true, isActive: true },
    });
  }
}

