import { IsString, IsDateString, IsNumber, IsOptional, IsEnum, IsUrl, IsArray, Min, Max, Length, Matches, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '../../enums/event-status.enum';

export class CreateEventDto {
  @IsString()
  @Length(1, 200)
  title: string;

  @IsString()
  @Length(1, 2000)
  description: string;

  @IsDateString()
  eventDate: string;

  @IsDateString()
  eventClosingDate: string;

  @IsNumber()
  @Min(1)
  @Max(1000000)
  capacity: number;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  venue?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

  @IsOptional()
  @IsUrl()
  streamingUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  minTicketPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  maxTicketPrice?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}
