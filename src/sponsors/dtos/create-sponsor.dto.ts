import { IsNotEmpty, IsObject, IsString, IsUrl } from 'class-validator';

export class CreateSponsorDto {
  @IsString()
  @IsNotEmpty()
  brandImage: string;

  @IsString()
  @IsNotEmpty()
  brandName: string;

  @IsUrl()
  brandWebsite: string;

  @IsObject()
  socialMediaLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
  };

  @IsNotEmpty()
  eventId: number;
}
