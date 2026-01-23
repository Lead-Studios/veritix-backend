import { IsString, IsOptional, IsBoolean, IsUUID, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VerificationStatus } from '../interfaces/verification.interface';

export class VerificationResponseDto {
  status: VerificationStatus;

  isValid: boolean;

  message: string;

  ticket?: VerifiedTicketInfoDto;

  verifiedAt: Date;

  verifiedBy?: string;

  deviceInfo?: string;

  location?: string;

  latitude?: string;

  longitude?: string;
}

export class VerifiedTicketInfoDto {
  ticketId: string;

  ticketCode: string;

  eventId: string;

  eventTitle: string;

  ticketTypeName: string;

  holderName?: string;

  seatInfo?: string;

  purchasePrice: number;

  purchaseCurrency: string;

  purchasedAt?: Date;

  eventDate: Date;

  eventVenue?: string;

  eventCity?: string;
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
  totalProcessed: number;

  successful: number;

  failed: number;

  results: VerificationResponseDto[];

  errors: VerificationErrorDto[];

  processedAt: Date;
}

export class VerificationErrorDto {
  ticketCode: string;

  error: string;

  status: VerificationStatus;
}
