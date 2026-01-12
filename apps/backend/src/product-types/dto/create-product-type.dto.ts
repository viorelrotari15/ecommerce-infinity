import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductTypeDto {
  @ApiProperty({ description: 'Product type name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Product type description' })
  @IsOptional()
  @IsString()
  description?: string;
}
