import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { SectionType } from '../entities/section.entity';

export class PositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;
}

export class SeatLayoutDto {
  @IsNumber()
  rows: number;

  @IsNumber()
  seatsPerRow: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  aislePositions?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rowLabels?: string[];
}

export class CreateSectionDto {
  @IsString()
  name: string;

  @IsEnum(SectionType)
  type: SectionType;

  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsNumber()
  capacity: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeatLayoutDto)
  seatLayout?: SeatLayoutDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  seatMapId: string;
}
