import { IsString, IsNotEmpty, IsUrl, IsOptional, IsBoolean, IsDate, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { SocialMediaDto } from './socialMedia.dto';
import { BankDetailsDto } from './bankDetails.dto';
import { LocationDto } from './location.dto';

export class CreateConferenceDto {
  @IsString()
  @IsNotEmpty()
  conferenceName: string;

  @IsString()
  @IsNotEmpty()
  conferenceCategory: string;

  @IsISO8601()
  @Type(() => Date)
  conferenceDate: Date;

  @IsISO8601()
  @Type(() => Date)
  conferenceClosingDate: Date;

  @IsString()
  @IsNotEmpty()
  conferenceDescription: string;

  @IsUrl()
  @IsNotEmpty()
  conferenceImage: string;

  @IsNotEmpty()
  location: LocationDto;

  @IsBoolean()
  @IsOptional()
  comingSoon?: boolean;

  @IsBoolean()
  @IsOptional()
  transactionCharge?: boolean;

  @IsNotEmpty()
  bankDetails: BankDetailsDto;

  @IsOptional()
  socialMedia?: SocialMediaDto;
}
