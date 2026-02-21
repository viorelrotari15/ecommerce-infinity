import { IsEmail, IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { sanitizeEmail, sanitizeShortText } from '../../common/sanitize';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  @Transform(({ value }) => sanitizeEmail(value))
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^[^<>]*$/, { message: 'Password must not contain < or >' })
  @Matches(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 200) : value))
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 200) : value))
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 50) : value))
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
