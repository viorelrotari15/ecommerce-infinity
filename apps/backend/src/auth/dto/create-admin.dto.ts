import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { sanitizeEmail, sanitizeShortText } from '../../common/sanitize';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  @Transform(({ value }) => sanitizeEmail(value))
  email: string;

  @ApiProperty({ example: 'AdminPass1', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^[^<>]*$/, { message: 'Password must not contain < or >' })
  @Matches(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  password: string;

  @ApiProperty({ example: 'Admin', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 200) : value))
  firstName?: string;

  @ApiProperty({ example: 'User', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 200) : value))
  lastName?: string;
}
