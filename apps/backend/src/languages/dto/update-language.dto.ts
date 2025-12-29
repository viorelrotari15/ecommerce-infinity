import { IsString, IsBoolean, IsOptional, Length } from 'class-validator';

export class UpdateLanguageDto {
  @IsString()
  @IsOptional()
  @Length(2, 5)
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

