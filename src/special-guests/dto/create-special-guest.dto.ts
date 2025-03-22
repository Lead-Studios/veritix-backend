import { IsString, IsOptional, IsUUID, IsUrl } from 'class-validator';

export class CreateSpecialGuestDto {
  @IsString()
  name: string;

  @IsUUID()
  eventId: string;

  @IsUrl()
  imageUrl: string;

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
