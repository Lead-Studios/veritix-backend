import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateConferenceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
