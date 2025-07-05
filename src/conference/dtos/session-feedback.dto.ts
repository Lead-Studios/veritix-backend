import { IsInt, IsOptional, IsString } from 'class-validator';

export class SessionFeedbackDto {
  @IsInt()
  sessionId: number;

  @IsOptional()
  @IsInt()
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
