import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum TimeframeEnum {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
}

export enum PriceTierEnum {
  BASIC = "basic",
  PREMIUM = "premium",
  VIP = "vip",
  ALL = "all",
}

export class RevenueForecastQueryDto {
  @ApiPropertyOptional({ description: "Event ID to filter predictions" })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    enum: TimeframeEnum,
    description: "Timeframe for prediction",
    default: TimeframeEnum.MONTHLY,
  })
  @IsOptional()
  @IsEnum(TimeframeEnum)
  timeframe?: TimeframeEnum = TimeframeEnum.MONTHLY;

  @ApiPropertyOptional({
    enum: PriceTierEnum,
    description: "Price tier to filter",
    default: PriceTierEnum.ALL,
  })
  @IsOptional()
  @IsEnum(PriceTierEnum)
  priceTier?: PriceTierEnum = PriceTierEnum.ALL;

  @ApiPropertyOptional({
    description: "Number of periods to forecast",
    default: 12,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  forecastPeriods?: number = 12;

  @ApiPropertyOptional({
    description: "Start date for historical data analysis",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date for historical data analysis" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class RevenueForecastResponseDto {
  @ApiProperty({ description: "Historical revenue data points" })
  historicalData: HistoricalDataPoint[];

  @ApiProperty({ description: "Predicted revenue data points" })
  predictions: PredictionDataPoint[];

  @ApiProperty({ description: "Model performance metrics" })
  modelMetrics: ModelMetrics;

  @ApiProperty({ description: "Applied filters" })
  filters: RevenueForecastQueryDto;

  @ApiProperty({
    description: "Total predicted revenue for the forecast period",
  })
  totalPredictedRevenue: number;

  @ApiProperty({ description: "Confidence interval for predictions" })
  confidenceInterval: {
    lower: number[];
    upper: number[];
  };
}

export class HistoricalDataPoint {
  @ApiProperty()
  date: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  ticketsSold: number;

  @ApiProperty()
  averagePrice: number;
}

export class PredictionDataPoint {
  @ApiProperty()
  date: string;

  @ApiProperty()
  predictedRevenue: number;

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  trend: "increasing" | "decreasing" | "stable";
}

export class ModelMetrics {
  @ApiProperty()
  rSquared: number;

  @ApiProperty()
  meanAbsoluteError: number;

  @ApiProperty()
  rootMeanSquareError: number;

  @ApiProperty()
  modelType: string;
}
