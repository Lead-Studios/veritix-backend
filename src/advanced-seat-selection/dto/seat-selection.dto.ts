import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SelectSeatDto {
  @ApiProperty({ description: 'Session ID for the seat selection' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'User ID (optional for guest users)', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class DeselectSeatDto {
  @ApiProperty({ description: 'Session ID for the seat deselection' })
  @IsString()
  sessionId: string;
}

export class ExtendReservationDto {
  @ApiProperty({ description: 'Session ID for the reservation' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Extension time in minutes', required: false, default: 15 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  extensionMinutes?: number = 15;
}

export class CompleteReservationDto {
  @ApiProperty({ description: 'Order ID or payment reference' })
  @IsString()
  completionReference: string;
}

export class UpgradeReservationDto {
  @ApiProperty({ 
    description: 'New reservation type',
    enum: ['temporary', 'checkout', 'hold', 'group']
  })
  @IsString()
  newType: 'temporary' | 'checkout' | 'hold' | 'group';

  @ApiProperty({ description: 'Extension time in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  extensionMinutes?: number;
}

export class BulkUpdateSeatsDto {
  @ApiProperty({ description: 'Array of seat IDs to update' })
  @IsArray()
  @IsUUID(4, { each: true })
  seatIds: string[];

  @ApiProperty({ 
    description: 'New seat status',
    enum: ['available', 'sold', 'blocked', 'maintenance']
  })
  @IsString()
  status: 'available' | 'sold' | 'blocked' | 'maintenance';

  @ApiProperty({ description: 'Additional metadata for the update', required: false })
  @IsOptional()
  metadata?: any;
}

export class PriceRangeDto {
  @ApiProperty({ description: 'Minimum price' })
  @IsNumber()
  @Min(0)
  min: number;

  @ApiProperty({ description: 'Maximum price' })
  @IsNumber()
  @Min(0)
  max: number;
}

export class FindBestSeatsDto {
  @ApiProperty({ description: 'Number of seats requested' })
  @IsNumber()
  @Min(1)
  @Max(50)
  quantity: number;

  @ApiProperty({ description: 'Preferred sections', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sectionPreferences?: string[];

  @ApiProperty({ description: 'Price range preference', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @ApiProperty({ description: 'Require accessibility features', required: false })
  @IsOptional()
  @IsBoolean()
  accessibilityRequired?: boolean;

  @ApiProperty({ description: 'Require adjacent seating', required: false })
  @IsOptional()
  @IsBoolean()
  adjacentRequired?: boolean;

  @ApiProperty({ description: 'Maximum row spread allowed', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRowSpread?: number;
}

export class ReleaseSeatsDto {
  @ApiProperty({ description: 'Reason for releasing seats', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SeatSelectionResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Error message if operation failed', required: false })
  message?: string;

  @ApiProperty({ description: 'Reservation expiry time', required: false })
  reservedUntil?: Date;

  @ApiProperty({ description: 'Seat price', required: false })
  price?: number;
}

export class SeatDetailsResponseDto {
  @ApiProperty({ description: 'Seat ID' })
  id: string;

  @ApiProperty({ description: 'Section ID' })
  sectionId: string;

  @ApiProperty({ description: 'Section name' })
  sectionName: string;

  @ApiProperty({ description: 'Row identifier' })
  row: string;

  @ApiProperty({ description: 'Seat number' })
  number: string;

  @ApiProperty({ description: 'Display label' })
  label: string;

  @ApiProperty({ description: 'Current seat status' })
  status: string;

  @ApiProperty({ description: 'Seat type' })
  type: string;

  @ApiProperty({ description: 'Accessibility type' })
  accessibilityType: string;

  @ApiProperty({ description: 'Base price' })
  basePrice: number;

  @ApiProperty({ description: 'Current effective price' })
  currentPrice: number;

  @ApiProperty({ description: 'Seat position coordinates' })
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @ApiProperty({ description: 'Seat features' })
  features: any;

  @ApiProperty({ description: 'Seat restrictions' })
  restrictions: any;

  @ApiProperty({ description: 'Whether seat is selectable' })
  isSelectable: boolean;

  @ApiProperty({ description: 'Popularity score' })
  popularityScore: number;

  @ApiProperty({ description: 'Selection count' })
  selectionCount: number;

  @ApiProperty({ description: 'Last selected timestamp' })
  lastSelectedAt: Date;

  @ApiProperty({ description: 'Pricing tier information', required: false })
  pricingTier?: any;

  @ApiProperty({ description: 'Active reservation information', required: false })
  reservation?: any;

  @ApiProperty({ description: 'Adjacent seat IDs' })
  adjacentSeats: any;
}

export class SeatAvailabilityResponseDto {
  @ApiProperty({ description: 'Total number of seats' })
  totalSeats: number;

  @ApiProperty({ description: 'Available seats count' })
  availableSeats: number;

  @ApiProperty({ description: 'Sold seats count' })
  soldSeats: number;

  @ApiProperty({ description: 'Held seats count' })
  heldSeats: number;

  @ApiProperty({ description: 'Seats grouped by status' })
  seatsByStatus: Record<string, number>;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}
