import { IsString, IsEmail, IsOptional, IsObject, IsArray, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class VendorProfileDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @IsOptional()
  @IsObject()
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };

  @IsOptional()
  @IsArray()
  specialties?: string[];

  @IsOptional()
  @IsArray()
  languages?: string[];

  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @IsOptional()
  @IsNumber()
  teamSize?: number;

  @IsOptional()
  @IsNumber()
  minimumBookingAmount?: number;

  @IsOptional()
  @IsNumber()
  advanceBookingDays?: number;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsString()
  refundPolicy?: string;
}

export class CreateVendorDto {
  @IsString()
  userId: string;

  @IsString()
  businessName: string;

  @IsString()
  businessRegistrationNumber: string;

  @IsString()
  taxId: string;

  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @IsOptional()
  @IsArray()
  serviceAreas?: string[];

  @IsOptional()
  @IsObject()
  businessHours?: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };

  @IsOptional()
  @IsObject()
  paymentMethods?: {
    bankAccount?: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
    };
    paypal?: {
      email: string;
    };
    stripe?: {
      accountId: string;
    };
  };

  @IsOptional()
  @ValidateNested()
  @Type(() => VendorProfileDto)
  profile?: VendorProfileDto;
}
