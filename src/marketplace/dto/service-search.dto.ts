import { IsOptional, IsString, IsNumber, IsEnum, IsObject, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../entities/service-listing.entity';

export class ServiceSearchDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  priceRange?: {
    min: number;
    max: number;
  };

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsObject()
  availability?: {
    date: Date;
    startTime?: string;
    endTime?: string;
  };

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
