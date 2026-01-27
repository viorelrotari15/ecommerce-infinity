import { IsArray, IsOptional, IsNumber, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AddressDto } from './address.dto';

class OrderItemDto {
  @ApiProperty()
  @IsString()
  variantId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress: AddressDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  shipping?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingMethodId?: string;

  @ApiProperty({ required: false, example: 'DE' })
  @IsOptional()
  @IsString()
  regionCode?: string;
}

