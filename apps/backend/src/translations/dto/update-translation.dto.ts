import { IsString, IsOptional } from 'class-validator';

export class UpdateTranslationDto {
  @IsString()
  @IsOptional()
  value?: string;
}

