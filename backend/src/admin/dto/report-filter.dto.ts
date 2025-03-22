import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsEnum, IsOptional, IsDateString, ValidateIf } from "class-validator"
import { Type } from "class-transformer"
import { ReportPeriodEnum } from "src/common/enums/report-period.enum"

export class ReportFilterDto {
  @ApiProperty({
    enum: ReportPeriodEnum,
    description: "Time period for the report",
    example: ReportPeriodEnum.MONTH,
  })
  @IsEnum(ReportPeriodEnum, {
    message: `Period must be one of: ${Object.values(ReportPeriodEnum).join(", ")}`,
  })
  period: ReportPeriodEnum

  @ApiPropertyOptional({
    description: "Start date for custom period (ISO format)",
    example: "2023-01-01",
  })
  @IsOptional()
  @ValidateIf((o) => o.period === ReportPeriodEnum.CUSTOM)
  @IsDateString({}, { message: "Start date must be a valid ISO date string" })
  @Type(() => Date)
  startDate?: string

  @ApiPropertyOptional({
    description: "End date for custom period (ISO format)",
    example: "2023-12-31",
  })
  @IsOptional()
  @ValidateIf((o) => o.period === ReportPeriodEnum.CUSTOM)
  @IsDateString({}, { message: "End date must be a valid ISO date string" })
  @Type(() => Date)
  endDate?: string
}

