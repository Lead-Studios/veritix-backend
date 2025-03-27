import { 
  IsString, 
  IsNotEmpty, 
  IsUUID, 
  MaxLength 
} from 'class-validator';

export class CreateEventGalleryDto {
  @IsString()
  @IsNotEmpty({ message: 'Image URL is required' })
  imageUrl: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(500, { message: 'Description cannot be longer than 500 characters' })
  description: string;

  @IsString()
  @IsUUID()
  @IsNotEmpty({ message: 'Event ID is required' })
  eventId: string;
}

export class UpdateEventGalleryDto {
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(500, { message: 'Description cannot be longer than 500 characters' })
  description: string;
}