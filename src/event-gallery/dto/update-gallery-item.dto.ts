import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { MediaType } from './create-gallery-item.dto';

export class UpdateGalleryItemDto {
  @ApiPropertyOptional({
    description: 'Updated title of the gallery item',
    example: 'Updated Opening Ceremony'
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the gallery item',
    example: 'New description of the opening ceremony fireworks display'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated alt text for accessibility',
    example: 'Updated description of fireworks display over the main stage'
  })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiPropertyOptional({
    description: 'Updated media type',
    enum: MediaType,
    example: MediaType.VIDEO
  })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @ApiPropertyOptional({
    description: 'Updated tags for categorizing the media',
    example: ['updated', 'opening', 'ceremony', 'highlights']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Updated order/position in the gallery',
    example: 2
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Updated metadata for the gallery item',
    example: {
      camera: 'Sony A7III',
      location: 'Main Stage - Center',
      timestamp: '2025-04-30T20:30:00Z',
      editor: 'John Doe'
    }
  })
  @IsOptional()
  metadata?: Record<string, any>;
}