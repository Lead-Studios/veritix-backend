import { IsString, IsNotEmpty } from 'class-validator';

export class RefundDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
