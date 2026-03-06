import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailService } from '../email/email.service';
import { ReturnsService } from '../returns/returns.service';
import { WithdrawalReturnRequestDto } from './dto/withdrawal-return.dto';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly emailService: EmailService,
    private readonly returnsService: ReturnsService,
  ) {}

  @Post('withdrawal-return')
  @ApiOperation({ summary: 'Submit withdrawal/return/cancellation request (saves to DB and sends email)' })
  async withdrawalReturn(@Body() dto: WithdrawalReturnRequestDto): Promise<{ message: string }> {
    const payload = {
      orderNumber: dto.orderNumber.trim(),
      fullName: dto.fullName.trim(),
      email: dto.email.trim(),
      deliveryAddress: dto.deliveryAddress.trim(),
      requestType: dto.requestType.trim(),
      reason: dto.reason.trim() || '—',
      language: dto.language?.trim() || undefined,
    };
    await this.returnsService.create(payload);
    await this.emailService.sendWithdrawalReturnRequest(payload);
    return { message: 'Request sent successfully. We will contact you shortly.' };
  }
}
