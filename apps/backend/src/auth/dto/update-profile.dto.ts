import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeShortText } from '../../common/sanitize';

export class UpdateProfileDto {
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
  @IsString()
  @MaxLength(2000)
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  defaultShippingAddress?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  defaultBillingAddress?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  savedAddresses?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiddenAddressKeys?: string[];
}
