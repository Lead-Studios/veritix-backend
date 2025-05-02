import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Name of the event category',
    example: 'Technology'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the event category',
    example: 'Events related to technology, innovation, and digital transformation'
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Icon identifier for the category',
    example: 'tech-icon'
  })
  @IsString()
  @IsOptional()
  icon?: string;
}
