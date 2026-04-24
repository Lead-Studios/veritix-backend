import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsEnum,
  IsBoolean,
  Length,
  IsArray,
  ArrayUnique,
} from 'class-validator';
import { EventStatus } from '../enums/event-status.enum';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  venue: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  @Length(2, 2)
  countryCode?: string;

  @IsBoolean()
  @IsOptional()
  isVirtual?: boolean = false;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsDateString()
  eventDate: string;

  @IsDateString()
  @IsOptional()
  eventClosingDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  capacity?: number = 0;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  tags?: string[];

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus = EventStatus.DRAFT;
}
