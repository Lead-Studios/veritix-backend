import { IsString, IsOptional, IsNumber, IsUUID, IsDateString } from 'class-validator';

export class AssignSeatDto {
  @IsUUID()
  seatId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @IsNumber()
  assignedPrice: number;

  @IsOptional()
  @IsString()
  purchaseReference?: string;
}

export class HoldSeatDto {
  @IsUUID()
  seatId: string;

  @IsString()
  holdReference: string;

  @IsOptional()
  @IsDateString()
  heldUntil?: string; // ISO date string
}

export class ReleaseSeatDto {
  @IsUUID()
  seatId: string;

  @IsOptional()
  @IsString()
  holdReference?: string;
}

export class TransferSeatDto {
  @IsUUID()
  seatId: string;

  @IsUUID()
  fromUserId: string;

  @IsUUID()
  toUserId: string;

  @IsOptional()
  @IsString()
  transferReference?: string;
}
