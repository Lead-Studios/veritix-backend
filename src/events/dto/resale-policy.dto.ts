import { IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class ResalePolicyDto {
  @IsOptional()
  @IsNumber()
  maxResalePrice?: number;

  @IsOptional()
  @IsDateString()
  transferDeadline?: string;

  @IsOptional()
  @IsBoolean()
  resaleLocked?: boolean;
}
