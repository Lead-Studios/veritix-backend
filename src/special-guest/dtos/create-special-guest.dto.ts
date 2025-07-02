import { IsString, IsUUID, IsUrl, IsOptional } from 'class-validator';

export class CreateSpecialGuestDto {
  @IsString()
  image: string;

  @IsUUID()
  eventId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  facebook?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  instagram?: string;
} 