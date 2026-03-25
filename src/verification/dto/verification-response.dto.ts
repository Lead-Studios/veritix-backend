import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '../interfaces/verification.interface';

export class VerificationResponseDto {
  @ApiProperty({ example: 'VERIFIED' })
  status: any;

  @ApiProperty()
  isValid: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ type: () => VerifiedTicketInfoDto })
  ticket?: VerifiedTicketInfoDto;

  @ApiProperty({ type: String, format: 'date-time' })
  verifiedAt: Date;

  @ApiPropertyOptional()
  verifiedBy?: string;

  @ApiPropertyOptional()
  deviceInfo?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  latitude?: string;

  @ApiPropertyOptional()
  longitude?: string;
}
export class VerifiedTicketInfoDto {
  @ApiProperty() ticketId: string;
  @ApiProperty() ticketCode: string;
  @ApiProperty() eventId: string;
  @ApiProperty() eventTitle: string;
  @ApiProperty() ticketTypeName: string;

  @ApiPropertyOptional() holderName?: string;
  @ApiPropertyOptional() seatInfo?: string;

  @ApiProperty() purchasePrice: number;
  @ApiProperty() purchaseCurrency: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  purchasedAt?: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  eventDate: Date;

  @ApiPropertyOptional() eventVenue?: string;
  @ApiPropertyOptional() eventCity?: string;
}

export class VerificationLogResponseDto {
  id: string;

  ticketCode: string;

  ticketId?: string;

  eventId: string;

  status: VerificationStatus;

  verifierId?: string;

  verifiedAt: Date;

  deviceInfo?: string;

  location?: string;

  latitude?: string;

  longitude?: string;

  event?: EventSummaryDto;

  verifier?: VerifierSummaryDto;
}

export class EventSummaryDto {
  id: string;

  title: string;

  eventDate: Date;

  venue?: string;

  city?: string;
}

export class VerifierSummaryDto {
  id: string;

  name?: string;

  email: string;

  role?: string;
}

export class VerificationStatsDto {
  eventId: string;

  totalTickets: number;

  verifiedCount: number;

  remainingCount: number;

  verificationRate: number;

  calculatedAt: Date;

  lastVerifiedAt?: Date;

  verificationTrend?: {
    hourly: number[];
    daily: number[];
  };
}

export class BulkVerificationResponseDto {
  @ApiProperty()
  totalProcessed: number;

  @ApiProperty()
  successful: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({
    type: () => [VerificationResponseDto],
  })
  results: VerificationResponseDto[];

  @ApiProperty({
    type: () => [VerificationErrorDto],
  })
  errors: VerificationErrorDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  processedAt: Date;
}

export class VerificationErrorDto {
  ticketCode: string;

  error: string;

  status: VerificationStatus;
}
