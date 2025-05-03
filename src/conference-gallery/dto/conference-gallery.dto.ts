import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateConferenceGalleryDto {
  @IsOptional()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  conferenceId: string;
}

export class UpdateConferenceGalleryDto {
  @IsOptional()
  @IsString()
  description?: string;
}
