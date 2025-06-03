import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum TimeRangeEnum {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  CUSTOM = 'custom'
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(TimeRangeEnum)
  timeRange?: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeRefunds?: boolean = false;
}
