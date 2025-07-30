import { IsString, IsUUID, IsUrl, IsOptional } from 'class-validator';

export class UpdateSpecialGuestDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  name?: string;

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
