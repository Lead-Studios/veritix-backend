import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNotEmpty,
} from "class-validator";

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video'
}

export class CreateGalleryItemDto {
  @ApiProperty({
    description: "ID of the event this gallery item belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  eventId: string;

  @ApiProperty({
    description: "URL of the uploaded image",
    example: "/uploads/event-gallery/123e4567-e89b-12d3-a456-426614174000.jpg",
  })
  @IsString()
  @IsNotEmpty({ message: "Image URL is required" })
  imageUrl: string;

  @ApiProperty({
    description: "Type of media being uploaded",
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiPropertyOptional({
    description: "Title of the gallery item",
    example: "Opening Ceremony",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: "Description of the gallery item",
    example: "Capture of the spectacular opening ceremony fireworks",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Alt text for accessibility",
    example: "Colorful fireworks display over the main stage",
  })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({
    description: "The media file to upload",
    type: "string",
    format: "binary",
  })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    description: "Tags for categorizing the media",
    example: ["opening", "ceremony", "fireworks"],
  })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "Order/position in the gallery",
    example: 1,
  })
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({
    description: "Additional metadata for the gallery item",
    example: {
      camera: "Canon EOS R5",
      location: "Main Stage",
      timestamp: "2025-04-30T20:00:00Z",
    },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
