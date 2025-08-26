import { IsString, IsNumber, IsDate, IsArray, IsOptional, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ABTestVariantDto {
  @ApiProperty({ description: 'Variant name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Variant description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Traffic percentage for this variant', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficPercentage: number;

  @ApiProperty({ description: 'Pricing strategy configuration' })
  @IsOptional()
  pricingStrategy?: {
    baseMultiplier: number;
    rules: any[];
  };
}

export class CreateABTestDto {
  @ApiProperty({ description: 'A/B test name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'A/B test description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Event ID' })
  @IsString()
  eventId: string;

  @ApiProperty({ description: 'Test variants', type: [ABTestVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ABTestVariantDto)
  variants: ABTestVariantDto[];

  @ApiProperty({ 
    description: 'Primary metric to optimize',
    enum: ['revenue', 'conversion_rate', 'tickets_sold']
  })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Confidence level (0-100)', minimum: 80, maximum: 99, default: 95 })
  @IsOptional()
  @IsNumber()
  @Min(80)
  @Max(99)
  confidenceLevel?: number;

  @ApiProperty({ description: 'Minimum detectable effect (%)', minimum: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumDetectableEffect?: number;

  @ApiProperty({ description: 'Test start date' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'Test end date' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}
