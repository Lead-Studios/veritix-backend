import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'otp123' })
  @IsNotEmpty({ message: 'otp is required' })
  @IsString()
  otp: string;
}
