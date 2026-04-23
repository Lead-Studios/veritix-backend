import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsEnum,
  IsBoolean,
  Length,
} from 'class-validator';
import { EventStatus } from '../enums/event-status.enum';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  location: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  @Length(2, 2)
  countryCode?: string;

  @IsBoolean()
  @IsOptional()
  isVirtual?: boolean;

  @IsDateString()
  eventDate: string;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  capacity?: number;
}
