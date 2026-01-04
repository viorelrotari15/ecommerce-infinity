import { Module } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CurrenciesController } from './currencies.controller';
import { CurrencyHelperService } from './currency-helper.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService, CurrencyHelperService],
  exports: [CurrenciesService, CurrencyHelperService],
})
export class CurrenciesModule {}

