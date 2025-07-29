import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateSponsorDto {
  @IsNotEmpty()
  @IsString()
  brandImage: string;

  @IsNotEmpty()
  @IsString()
  brandName: string;

  @IsNotEmpty()
  @IsUrl()
  brandWebsite: string;

  @IsOptional()
  @IsUrl()
  facebook?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  instagram?: string;

  @IsNotEmpty()
  @IsUUID()
  eventId: string;
}
