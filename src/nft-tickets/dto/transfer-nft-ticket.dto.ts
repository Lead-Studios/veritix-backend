import { IsString, IsNotEmpty } from 'class-validator';

import { IsNumber, IsOptional } from 'class-validator';

export class TransferNftTicketDto {
  @IsString()
  @IsNotEmpty()
  readonly ticketId: string;

  @IsString()
  @IsNotEmpty()
  readonly recipientWalletAddress: string;

  @IsOptional()
  @IsNumber()
  resalePrice?: number;
}
