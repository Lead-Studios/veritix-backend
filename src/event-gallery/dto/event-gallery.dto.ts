import { 
  IsString, 
  IsNotEmpty, 
  IsUUID, 
  MaxLength 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateEventGalleryDto {
  @ApiProperty({
    description: "URL of the uploaded image",
    example: "/uploads/event-gallery/123e4567-e89b-12d3-a456-426614174000.jpg",
  })
  @IsString()
  @IsNotEmpty({ message: "Image URL is required" })
  imageUrl: string;

  @ApiProperty({
    description: "Description of the gallery image",
    example: "Opening ceremony of the tech conference",
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: "Description is required" })
  @MaxLength(500, {
    message: "Description cannot be longer than 500 characters",
  })
  description?: string;

  @ApiProperty({
    description: "ID of the event this gallery image belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsUUID()
  @IsNotEmpty({ message: "Event ID is required" })
  eventId: string;
}

export class UpdateEventGalleryDto {
  @ApiProperty({
    description: "Updated description of the gallery image",
    example: "Keynote speech at the tech conference",
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: "Description is required" })
  @MaxLength(500, {
    message: "Description cannot be longer than 500 characters",
  })
  description: string;
}
