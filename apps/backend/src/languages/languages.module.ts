import { Module } from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { LanguagesController } from './languages.controller';
import { LanguageHelperService } from './language-helper.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LanguagesController],
  providers: [LanguagesService, LanguageHelperService],
  exports: [LanguagesService, LanguageHelperService],
})
export class LanguagesModule {}

