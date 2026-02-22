import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ClientErrorDto {
  @ApiPropertyOptional({ description: 'Error message' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ description: 'Stack trace' })
  @IsString()
  @IsOptional()
  @MaxLength(8000)
  stack?: string;

  @ApiPropertyOptional({ description: 'Page URL when error occurred' })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional({ description: 'User agent' })
  @IsString()
  @IsOptional()
  @MaxLength(512)
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Source of error (e.g. window.onerror, unhandledrejection)' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  source?: string;
}
