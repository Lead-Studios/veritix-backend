import { IsString, IsOptional } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsString()
  period?: 'week' | 'month' | 'year';
} 