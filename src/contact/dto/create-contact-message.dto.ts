import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactMessageDto {
  @ApiProperty({
    example: 'John Doe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'john@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Issue with ticket purchase',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  subject: string;

  @ApiProperty({
    example: 'I am unable to complete my ticket purchase...',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
