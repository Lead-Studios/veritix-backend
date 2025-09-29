import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'test@example.com',
    description: 'Unique email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (will be hashed)',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'admin', description: 'User role', required: false })
  role?: string;
}
