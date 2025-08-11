
import { IsString, IsNotEmpty, IsNumber, IsDefined, Min } from 'class-validator';

import { IsNumber, IsOptional } from 'class-validator';

export class TransferNftTicketDto {
  @IsString()
  @IsNotEmpty()
  readonly ticketId: string;

  @IsString()
  @IsNotEmpty()
  readonly recipientWalletAddress: string;

  @IsDefined()
  @IsNumber()
  @Min(0)
  resalePrice: number;
}
