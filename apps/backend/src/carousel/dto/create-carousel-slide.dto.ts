import { IsOptional, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCarouselSlideDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUrl()
  link?: string;
}
