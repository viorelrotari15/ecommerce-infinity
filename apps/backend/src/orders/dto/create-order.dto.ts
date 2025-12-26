import { IsArray, IsObject, IsOptional, IsNumber, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty()
  @IsObject()
  shippingAddress: any;

  @ApiProperty()
  @IsObject()
  billingAddress: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  shipping?: number;
}

