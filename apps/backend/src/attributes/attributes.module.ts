import { Module } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { AttributesController } from './attributes.controller';
import { LanguagesModule } from '../languages/languages.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [LanguagesModule, PrismaModule],
  controllers: [AttributesController],
  providers: [AttributesService],
  exports: [AttributesService],
})
export class AttributesModule {}

