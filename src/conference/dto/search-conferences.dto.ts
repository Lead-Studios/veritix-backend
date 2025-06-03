import { IsOptional, IsString, MinLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchConferencesDto {
  @IsString()
  @MinLength(2)
  query: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit: number = 10;
}
