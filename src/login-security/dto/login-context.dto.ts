import { IsString, IsNotEmpty, IsOptional, IsEnum, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginMethod } from '../entities/login-attempt.entity';

export class LoginContextDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'IP address of the login attempt' })
  @IsIP()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({ description: 'User agent string from the browser' })
  @IsString()
  @IsNotEmpty()
  userAgent: string;

  @ApiProperty({ description: 'Login method used', enum: LoginMethod })
  @IsEnum(LoginMethod)
  method: LoginMethod;

  @ApiPropertyOptional({ description: 'Owner ID for multi-tenant support' })
  @IsOptional()
  @IsString()
  ownerId?: string;
}
