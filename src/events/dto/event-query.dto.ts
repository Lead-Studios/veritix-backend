import { IsOptional, IsString, IsBoolean, IsDateString, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EventStatus } from '../enums/event-status.enum';

export class EventQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVirtual?: boolean;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['eventDate', 'createdAt'])
  sortBy?: 'eventDate' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
