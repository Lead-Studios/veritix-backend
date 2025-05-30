import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  ArrayMinSize,
  Length,
  IsInt,
} from "class-validator"
import { ApiProperty } from "@nestjs/swagger"
import { Transform, Type } from "class-transformer"

export class CreateTicketTierDto {
  @ApiProperty({
    description: "Name of the ticket tier",
    example: "VIP Pass",
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100, { message: "Tier name must be between 2 and 100 characters" })
  name: string

  @ApiProperty({
    description: "Detailed description of the ticket tier",
    example: "Premium access with backstage pass and complimentary drinks",
  })
  @IsString()
  @Length(10, 1000, { message: "Description must be between 10 and 1000 characters" })
  description: string

  @ApiProperty({
    description: "Price per ticket in this tier",
    example: 199.99,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "Price must have at most 2 decimal places" })
  @Min(0, { message: "Price must be non-negative" })
  @Type(() => Number)
  price: number

  @ApiProperty({
    description: "Total number of tickets available in this tier",
    example: 100,
    minimum: 1,
  })
  @IsInt({ message: "Total quantity must be an integer" })
  @Min(1, { message: "Total quantity must be at least 1" })
  @Type(() => Number)
  totalQuantity: number

  @ApiProperty({
    description: "List of benefits included with this ticket tier",
    example: ["Backstage access", "Meet & greet", "Complimentary drinks", "VIP parking"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one benefit must be specified" })
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  benefits: string[]

  @ApiProperty({
    description: "Whether this ticket tier is currently active for sale",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean = true

  @ApiProperty({
    description: "Date and time when ticket sales start for this tier",
    example: "2025-01-01T00:00:00Z",
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: "Sale start date must be a valid ISO date string" })
  saleStartDate?: string

  @ApiProperty({
    description: "Date and time when ticket sales end for this tier",
    example: "2025-12-31T23:59:59Z",
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: "Sale end date must be a valid ISO date string" })
  saleEndDate?: string

  @ApiProperty({
    description: "Maximum number of tickets a single user can purchase from this tier",
    example: 4,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: "Max per user must be an integer" })
  @Min(1, { message: "Max per user must be at least 1" })
  @Max(50, { message: "Max per user cannot exceed 50" })
  @Type(() => Number)
  maxPerUser?: number

  @ApiProperty({
    description: "Sort order for displaying ticket tiers (lower numbers appear first)",
    example: 1,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: "Sort order must be an integer" })
  @Min(0, { message: "Sort order must be non-negative" })
  @Type(() => Number)
  sortOrder?: number = 0
}
