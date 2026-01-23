import { Module, forwardRef } from '@nestjs/common';
import { TranslationsService } from './translations.service';
import { TranslationsController } from './translations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LanguagesModule } from '../languages/languages.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, forwardRef(() => LanguagesModule), RedisModule],
  controllers: [TranslationsController],
  providers: [TranslationsService],
  exports: [TranslationsService],
})
export class TranslationsModule {}

