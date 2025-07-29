import { IsUUID } from 'class-validator';

export class GetTicketHistoryDto {
  @IsUUID()
  id: string;
}
