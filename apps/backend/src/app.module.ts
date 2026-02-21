import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { AttributesModule } from './attributes/attributes.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ImagesModule } from './images/images.module';
import { StorageModule } from './storage/storage.module';
import { CartModule } from './cart/cart.module';
import { LanguagesModule } from './languages/languages.module';
import { TranslationsModule } from './translations/translations.module';
import { LanguageInterceptor } from './languages/interceptors/language.interceptor';
import { CheckoutModule } from './checkout/checkout.module';
import { RedisModule } from './redis/redis.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { CarouselModule } from './carousel/carousel.module';
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting: prevent loop/abuse calls (per IP)
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },   // 10 req/sec
      { name: 'medium', ttl: 10000, limit: 50 }, // 50 req/10s
      { name: 'long', ttl: 60000, limit: 100 },  // 100 req/min
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
    AttributesModule,
    OrdersModule,
    PaymentsModule,
    StorageModule,
    ImagesModule,
    CarouselModule,
    CartModule,
    LanguagesModule,
    TranslationsModule,
    CheckoutModule,
    RedisModule,
    MetricsModule,
    LogsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LanguageInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}

