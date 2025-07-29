import { IsString, IsUUID, MaxLength, IsOptional } from 'class-validator';

export class UpdatePosterDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;
} 