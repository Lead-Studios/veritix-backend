import { IsOptional, IsDateString, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsFiltersDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tracks?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  speakerIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conferenceId?: string;
}