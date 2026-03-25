import { IsString, MinLength, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty({ message: 'fullName can not be empty' })
  @IsString({ message: 'fullName must be a string' })
  fullName: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'password can not be empty' })
  @MinLength(6, { message: 'password must be at least 6 character long' })
  password: string;
}
