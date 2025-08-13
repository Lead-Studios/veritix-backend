import { IsOptional, IsEnum, IsString, IsUUID, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { SeatStatus, SeatType } from '../entities/seat.entity';
import { SectionType } from '../entities/section.entity';

export class SeatQueryDto {
  @IsOptional()
  @IsEnum(SeatStatus)
  status?: SeatStatus;

  @IsOptional()
  @IsEnum(SeatType)
  type?: SeatType;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsString()
  row?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  maxPrice?: number;
}

export class SectionQueryDto {
  @IsOptional()
  @IsEnum(SectionType)
  type?: SectionType;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeSeats?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  onlyAvailable?: boolean;
}
