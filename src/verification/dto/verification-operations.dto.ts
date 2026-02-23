import { IsString, IsOptional, IsBoolean, IsUUID, Length, Matches, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyTicketDto {
  @IsString()
  @Length(1, 100)
  ticketCode: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  verifierId?: string;

  @IsOptional()
  @IsBoolean()
  markAsUsed?: boolean = true;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  deviceInfo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  location?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,6}$/)
  latitude?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?((1[0-7]|[1-9])?\d)\.{1}\d{1,6}$/)
  longitude?: string;
}

export class CheckInDto {
  @IsString()
  @Length(1, 100)
  ticketCode: string;

  @IsOptional()
  @IsUUID()
  verifierId?: string;
}

export class BulkVerifyTicketsDto {
  @IsString()
  @Length(1, 100, { each: true })
  ticketCodes: string[];

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  verifierId?: string;

  @IsOptional()
  @IsBoolean()
  markAsUsed?: boolean = true;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  deviceInfo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  location?: string;
}

export class VerificationQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  verifierId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  ticketCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  status?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  location?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'verifiedAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ManualVerificationDto {
  @IsString()
  @Length(1, 100)
  ticketCode: string;

  @IsString()
  @Length(1, 500)
  reason: string;

  @IsOptional()
  @IsUUID()
  verifierId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string;
}
