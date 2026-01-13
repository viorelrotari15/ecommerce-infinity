import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttributeTranslationDto {
  @ApiProperty({ description: 'Attribute name in the specified language' })
  @IsString()
  name: string;
}
