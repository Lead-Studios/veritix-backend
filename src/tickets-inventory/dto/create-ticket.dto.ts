import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateTicketDto {
  @IsUUID()
  ticketTypeId: string;

  @IsOptional()
  @IsString()
  orderReference?: string;

  @IsOptional()
  @IsString()
  attendeeEmail?: string;

  @IsOptional()
  @IsString()
  attendeeName?: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}
