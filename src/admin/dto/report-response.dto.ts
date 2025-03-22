import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ReportPeriodEnum } from "src/common/enums/report-period.enum";

export class ReportResponseDto {
  @ApiProperty({ example: 100 })
  totalUsers: number;

  @ApiProperty({ example: 85 })
  activeUsers: number;
  @ApiProperty({ example: 15 })
  inactiveUsers: number;

  @ApiProperty({
    example: {
      admin: 5,
      user: 80,
      moderator: 15,
    },
  })
  usersByRole: Record<string, number>;

  @ApiProperty({
    enum: ReportPeriodEnum,
    example: ReportPeriodEnum.MONTH,
  })
  period: ReportPeriodEnum;

  @ApiPropertyOptional({ example: "2023-01-01T00:00:00Z" })
  startDate?: Date;

  @ApiPropertyOptional({ example: "2023-12-31T23:59:59Z" })
  endDate?: Date;

  @ApiProperty({ example: "2024-01-15T12:30:45Z" })
  generatedAt: Date;
}
