import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ReturnsModule } from '../returns/returns.module';
import { ContactController } from './contact.controller';

@Module({
  imports: [EmailModule, ReturnsModule],
  controllers: [ContactController],
})
export class ContactModule {}
