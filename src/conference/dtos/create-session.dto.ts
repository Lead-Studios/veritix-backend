import { IsString, IsInt, IsDateString, IsOptional, IsArray } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsInt()
  durationMinutes: number;

  @IsString()
  room: string;

  @IsOptional()
  @IsInt()
  trackId?: number;

  @IsOptional()
  @IsArray()
  speakerIds?: number[];
}
