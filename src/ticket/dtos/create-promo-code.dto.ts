import { IsString, IsNumber, IsInt, IsDateString, IsNotEmpty } from 'class-validator';

export class CreatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  discount: number; // e.g. 0.15 for 15% off

  @IsInt()
  maxUses: number;

  @IsDateString()
  expiresAt: string;
}
