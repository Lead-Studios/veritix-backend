import { IsString, MinLength, IsNotEmpty, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterOrganizerDto {
  @ApiProperty({ example: 'organizer@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty({ message: 'fullName cannot be empty' })
  @IsString({ message: 'fullName must be a string' })
  fullName: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'password cannot be empty' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({ example: 'Acme Events LLC' })
  @IsOptional()
  @IsString({ message: 'organizationName must be a string' })
  @MaxLength(100, { message: 'organizationName must not exceed 100 characters' })
  organizationName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString({ message: 'phone must be a string' })
  @MaxLength(30, { message: 'phone must not exceed 30 characters' })
  phone?: string;
}
