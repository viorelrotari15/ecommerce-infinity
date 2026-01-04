import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LanguagesModule } from '../languages/languages.module';
import { CurrenciesModule } from '../currencies/currencies.module';

@Module({
  imports: [StorageModule, PrismaModule, LanguagesModule, CurrenciesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

