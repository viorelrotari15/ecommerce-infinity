import { IsString, IsBoolean, IsOptional, Length } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @Length(2, 5)
  code: string; // "en", "ro", "ru", etc.

  @IsString()
  name: string; // "English", "Romanian", etc.

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

