import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandTranslationDto {
  @ApiProperty({ description: 'Brand name in the specified language' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Brand description in the specified language' })
  @IsOptional()
  @IsString()
  description?: string;
}
