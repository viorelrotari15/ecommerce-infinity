import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryTranslationDto {
  @ApiProperty({ description: 'Category name in the specified language' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Category description in the specified language' })
  @IsOptional()
  @IsString()
  description?: string;
}
