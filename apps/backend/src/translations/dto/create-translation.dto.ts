import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTranslationDto {
  @IsString()
  @IsNotEmpty()
  key: string; // "header.menu.home"

  @IsString()
  @IsNotEmpty()
  language: string; // "en"

  @IsString()
  @IsNotEmpty()
  value: string; // "Home"
}

