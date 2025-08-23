import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class LayoutDto {
  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsOptional()
  @IsString()
  orientation?: 'landscape' | 'portrait';

  @IsOptional()
  @IsObject()
  stage?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class CreateSeatMapDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  venueName: string;

  @IsNumber()
  totalCapacity: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LayoutDto)
  layout?: LayoutDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  eventId: string;
}
