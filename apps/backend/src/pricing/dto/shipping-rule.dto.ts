import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateShippingRuleDto {
  @ApiProperty()
  @IsString()
  shippingMethodId: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  minSubtotal: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxSubtotal?: number;

  @ApiProperty({ example: 4.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShippingRuleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minSubtotal?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxSubtotal?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
