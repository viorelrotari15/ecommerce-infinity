import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class AddressDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsString()
  houseNumber: string;

  @ApiProperty()
  @IsString()
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
  company?: string;
}
