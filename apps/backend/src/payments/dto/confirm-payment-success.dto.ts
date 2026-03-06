import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmPaymentSuccessDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: 'UI language code for email content (e.g. en, de)' })
  @IsOptional()
  @IsString()
  language?: string;
}
