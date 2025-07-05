import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateGalleryImageDto {
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsUUID()
  eventId: string;
}

export class UpdateGalleryImageDto {
  @IsNotEmpty()
  @IsString()
  description: string;
} 