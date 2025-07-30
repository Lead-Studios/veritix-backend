import { IsUUID } from 'class-validator';

export class GetTicketReceiptDto {
  @IsUUID()
  id: string;
}
