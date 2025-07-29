import { IsOptional, IsUUID, IsDateString, IsString } from "class-validator"
import { Transform } from "class-transformer"

export class AnalyticsFilterDto {
  @IsOptional()
  @IsUUID()
  conferenceId?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  track?: string

  @IsOptional()
  @IsString()
  speaker?: string

  @IsOptional()
  @Transform(({ value }) => value === "true")
  exportToCsv?: boolean

  @IsOptional()
  @Transform(({ value }) => value === "true")
  exportToPdf?: boolean
}
