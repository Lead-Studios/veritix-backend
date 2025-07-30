import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePosterDto {
  @IsString()
  image: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsUUID()
  eventId: string;
}
