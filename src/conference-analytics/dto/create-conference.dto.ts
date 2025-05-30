import { IsNotEmpty, IsString, IsDateString, IsBoolean, IsOptional } from "class-validator"

export class CreateConferenceDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @IsString()
  description: string

  @IsNotEmpty()
  @IsString()
  location: string

  @IsNotEmpty()
  @IsString()
  organizerId: string

  @IsNotEmpty()
  @IsDateString()
  startDate: string

  @IsNotEmpty()
  @IsDateString()
  endDate: string

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}
