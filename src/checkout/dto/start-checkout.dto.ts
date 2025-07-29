import { IsOptional, IsString } from 'class-validator';

export class StartCheckoutDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  sessionId: string;
}
