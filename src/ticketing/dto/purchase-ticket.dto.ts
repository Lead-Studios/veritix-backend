import {
  IsUUID,
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class PurchaseTicketDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsUUID()
  @IsNotEmpty()
  purchaserId: string;

  @IsString()
  @IsNotEmpty()
  purchaserName: string;

  @IsEmail()
  @IsNotEmpty()
  purchaserEmail: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;
}
