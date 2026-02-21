import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, ValidateNested, Min, IsNumber, MaxLength } from 'class-validator';
import { AddressDto } from '../../orders/dto/address.dto';
import { sanitizeEmail } from '../../common/sanitize';

class CheckoutItemDto {
  @ApiProperty()
  @IsString()
  variantId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CheckoutEstimateDto {
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiProperty({ required: false, example: 'DE' })
  @IsOptional()
  @IsString()
  regionCode?: string;
}

export class CreateCheckoutDto {
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress: AddressDto;

  @ApiProperty()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  @Transform(({ value }) => sanitizeEmail(value))
  guestEmail: string;

  @ApiProperty()
  @IsString()
  shippingMethodId: string;

  @ApiProperty({ required: false, example: 'DE' })
  @IsOptional()
  @IsString()
  regionCode?: string;
}
