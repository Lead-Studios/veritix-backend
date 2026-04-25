import { IsString, IsOptional } from 'class-validator';

export class CheckInDto {
  @IsString()
  ticketCode: string;

  @IsOptional()
  @IsString()
  verifiedBy?: string;
}