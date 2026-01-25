import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, ValidateNested, Min, IsNumber } from 'class-validator';
import { AddressDto } from '../../orders/dto/address.dto';

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
  @IsEmail()
  guestEmail: string;

  @ApiProperty()
  @IsString()
  shippingMethodId: string;

  @ApiProperty({ required: false, example: 'DE' })
  @IsOptional()
  @IsString()
  regionCode?: string;
}
