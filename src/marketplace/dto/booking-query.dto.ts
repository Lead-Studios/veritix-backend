import { IsOptional, IsString, IsEnum, IsObject, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../entities/service-booking.entity';

export class BookingQueryDto {
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
  @IsEnum(BookingStatus)
  status?: BookingStatus | BookingStatus[];

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  organizerId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsObject()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
