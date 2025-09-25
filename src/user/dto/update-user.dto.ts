import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'newPassword123',
    description: 'Updated password',
  })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 'user', description: 'Updated role' })
  @IsOptional()
  role?: string;
}