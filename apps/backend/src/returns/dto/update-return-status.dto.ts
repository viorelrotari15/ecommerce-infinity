import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReturnRequestStatus } from '@prisma/client';

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ReturnRequestStatus })
  @IsEnum(ReturnRequestStatus)
  status: ReturnRequestStatus;

  @ApiPropertyOptional({ description: 'Admin notes (internal)' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNotes?: string;
}
