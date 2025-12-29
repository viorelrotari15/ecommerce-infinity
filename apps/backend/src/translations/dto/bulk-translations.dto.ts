import { IsString, IsObject, IsNotEmpty } from 'class-validator';

export class BulkTranslationsDto {
  @IsString()
  @IsNotEmpty()
  language: string;

  @IsObject()
  @IsNotEmpty()
  translations: Record<string, string>; // { "header.menu.home": "Home", ... }
}

