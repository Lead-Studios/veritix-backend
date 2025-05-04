import { IsNotEmpty, IsString, IsEmail, IsOptional, IsUUID } from "class-validator"

export class CreateAttendeeDto {
  @IsNotEmpty()
  @IsString()
  firstName: string

  @IsNotEmpty()
  @IsString()
  lastName: string

  @IsNotEmpty()
  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  company?: string

  @IsOptional()
  @IsString()
  jobTitle?: string

  @IsOptional()
  @IsString()
  profileImageUrl?: string

  @IsNotEmpty()
  @IsUUID()
  conferenceId: string
}
