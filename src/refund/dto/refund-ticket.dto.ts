import { IsOptional, IsNumber, Min, IsString } from 'class-validator';

export class RefundTicketDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
