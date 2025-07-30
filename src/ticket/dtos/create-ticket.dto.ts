import {
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  MaxLength,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsDateString()
  deadlineDate: string;

  @IsBoolean()
  isReserved: boolean;
}
