import { IsString, IsNumber, IsDate, IsUUID } from 'class-validator';

export class ReceiptDto {
  @IsUUID()
  receiptId: string;

  @IsString()
  userFullName: string;

  @IsString()
  userEmail: string;

  @IsString()
  conferenceName: string;

  @IsDate()
  conferenceDate: Date;

  @IsString()
  conferenceLocation: string;

  @IsNumber()
  ticketQuantity: number;

  @IsNumber()
  pricePerTicket: number;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  amountPaid: number;

  @IsDate()
  transactionDate: Date;
} 