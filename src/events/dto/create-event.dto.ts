import { IsString, IsDateString, IsNumber, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(1)
  capacity: number;
}
