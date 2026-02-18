import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StripeHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Customer email or partial match for search' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor for pagination (payment intent id or page token)' })
  @IsOptional()
  @IsString()
  startingAfter?: string;
}
