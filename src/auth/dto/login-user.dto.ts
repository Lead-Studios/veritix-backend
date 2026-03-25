import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import { MinLength, IsNotEmpty, IsEmail } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'password can not be empty' })
  @MinLength(8, { message: 'password must be at least 8 character long' })
  password: string;
}
