import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { sanitizeEmail } from '../../common/sanitize';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  @Transform(({ value }) => sanitizeEmail(value))
  email: string;
}
