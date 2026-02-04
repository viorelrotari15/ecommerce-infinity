import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}
