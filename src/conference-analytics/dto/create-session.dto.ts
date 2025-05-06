import { IsNotEmpty, IsString, IsDateString, IsNumber, IsOptional, IsUUID } from "class-validator"

export class CreateSessionDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsNotEmpty()
  @IsString()
  description: string

  @IsNotEmpty()
  @IsString()
  speakerName: string

  @IsOptional()
  @IsString()
  speakerBio?: string

  @IsNotEmpty()
  @IsDateString()
  startTime: string

  @IsNotEmpty()
  @IsDateString()
  endTime: string

  @IsNotEmpty()
  @IsString()
  room: string

  @IsOptional()
  @IsNumber()
  maxAttendees?: number

  @IsNotEmpty()
  @IsUUID()
  conferenceId: string
}
