import { IsString, IsNumber, IsBoolean, IsUUID, IsDate } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  name: string;

  @IsUUID()
  eventId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsString()
  description: string;

  @IsDate()
  deadlineDate: Date;

  @IsBoolean()
  isReserved: boolean;
}
