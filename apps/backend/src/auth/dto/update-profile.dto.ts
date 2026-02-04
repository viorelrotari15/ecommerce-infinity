import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  defaultShippingAddress?: Record<string, any>;

  @IsOptional()
  @IsObject()
  defaultBillingAddress?: Record<string, any>;
}
