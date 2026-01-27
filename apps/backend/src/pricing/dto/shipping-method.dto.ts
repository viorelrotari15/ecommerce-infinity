import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateShippingMethodDto {
  @ApiProperty({ example: 'DE' })
  @IsString()
  regionCode: string;

  @ApiProperty({ example: 'standard' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Standard Delivery' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'DHL' })
  @IsString()
  carrier: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isExpress?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShippingMethodDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isExpress?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
