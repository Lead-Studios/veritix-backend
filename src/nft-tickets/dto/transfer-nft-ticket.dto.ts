import { IsString, IsNotEmpty } from 'class-validator';

export class TransferNftTicketDto {
  @IsString()
  @IsNotEmpty()
  readonly ticketId: string;

  @IsString()
  @IsNotEmpty()
  readonly recipientWalletAddress: string;
}
