import { IsString, IsOptional } from 'class-validator';

export class UserReportFilterDto {
  @IsOptional()
  @IsString()
  period?: 'week' | 'month' | 'year';
} 