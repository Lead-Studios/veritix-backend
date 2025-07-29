import { IsUUID, IsString } from 'class-validator';

export class ResolveTicketDto {
  @IsUUID()
  ticketId: string;

  @IsString()
  resolution: string;
}
