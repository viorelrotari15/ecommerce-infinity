import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class WithdrawalReturnRequestDto {
  @ApiProperty({ example: 'ORD-12345678', description: 'Order number' })
  @IsString()
  @MinLength(1, { message: 'Order number is required' })
  @MaxLength(100)
  orderNumber: string;

  @ApiProperty({ example: 'Max Mustermann', description: 'Full name' })
  @IsString()
  @MinLength(1, { message: 'Full name is required' })
  @MaxLength(200)
  fullName: string;

  @ApiProperty({ example: 'customer@example.com', description: 'Customer email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Street 1, 12345 City, Country', description: 'Delivery address' })
  @IsString()
  @MinLength(1, { message: 'Delivery address is required' })
  @MaxLength(500)
  deliveryAddress: string;

  @ApiProperty({
    example: 'Withdrawal',
    description: 'Type: Withdrawal, Return, or Cancellation before dispatch',
    enum: ['Withdrawal', 'Return', 'Cancellation'],
  })
  @IsString()
  @MinLength(1, { message: 'Request type is required' })
  @MaxLength(50)
  requestType: string;

  @ApiProperty({ example: 'Changed my mind', description: 'Reason or additional notes' })
  @IsString()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({ example: 'de', description: 'UI language code (e.g. de, en)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}
