import { IsString, IsInt, IsNumber, IsBoolean, IsDateString, IsOptional, Min, MaxLength, IsUUID } from 'class-validator';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDateString()
  deadlineDate?: string;

  @IsOptional()
  @IsBoolean()
  isReserved?: boolean;
} 