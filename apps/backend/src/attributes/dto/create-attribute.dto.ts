import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttributeDto {
  @ApiProperty({ description: 'Attribute name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Parent attribute ID (for subattributes)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
