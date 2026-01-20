import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductTypeTranslationDto {
  @ApiProperty({ description: 'Product type name in the specified language' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Product type description in the specified language' })
  @IsOptional()
  @IsString()
  description?: string;
}
