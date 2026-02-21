import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeShortText } from '../../common/sanitize';

export class AddressDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 200) : value))
  firstName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 200) : value))
  lastName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 50) : value))
  phone: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 500) : value))
  street: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 50) : value))
  houseNumber: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 200) : value))
  city: string;

  @ApiProperty({ example: '10115' })
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Postal code must be 5 digits for Germany' })
  postalCode: string;

  @ApiProperty({ example: 'DE' })
  @IsString()
  @IsIn(['DE'])
  country: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (value != null ? sanitizeShortText(value, 200) : value))
  company?: string;
}
