import {
  IsString,
  IsDateString,
  IsBoolean,
  IsObject,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsDateString()
  eventDate: Date;

  @IsDateString()
  closingDate: Date;

  @IsString()
  description: string;

  @IsObject()
  location: {
    country: string;
    state: string;
    street: string;
    localGovernment: string;
    direction: string;
  };

  @IsBoolean()
  @IsOptional()
  hideLocation?: boolean;

  @IsBoolean()
  @IsOptional()
  comingSoon?: boolean;

  @IsBoolean()
  @IsOptional()
  transactionCharge?: boolean;

  @IsObject()
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };

  @IsObject()
  @IsOptional()
  socialMediaLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
}
