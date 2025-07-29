import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class ScanTicketDto {
  @IsString()
  @IsNotEmpty()
  qrCodeData: string;

  @IsUUID()
  @IsNotEmpty()
  scannedBy: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;
}
