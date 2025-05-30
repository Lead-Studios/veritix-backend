import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Updated name of the event category',
    example: 'Technology & Innovation'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the event category',
    example: 'Events focused on technology, innovation, and digital transformation in modern industries'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated icon identifier for the category',
    example: 'tech-innovation-icon'
  })
  @IsString()
  @IsOptional()
  icon?: string;
}