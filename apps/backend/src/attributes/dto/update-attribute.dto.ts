import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAttributeDto {
  @ApiPropertyOptional({ description: 'Attribute name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Parent attribute ID (for subattributes)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
