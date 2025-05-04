import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAttendeeDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  role?: string;
}