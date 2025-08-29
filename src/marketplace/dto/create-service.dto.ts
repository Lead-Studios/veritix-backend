import { IsString, IsEnum, IsOptional, IsArray, IsObject, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType } from '../entities/service-listing.entity';
import { PricingType, PricingTier } from '../entities/service-pricing.entity';

class ServicePricingDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PricingType)
  pricingType: PricingType;

  @IsOptional()
  @IsEnum(PricingTier)
  tier?: PricingTier;

  @IsNumber()
  basePrice: number;

  @IsOptional()
  @IsNumber()
  minimumPrice?: number;

  @IsOptional()
  @IsNumber()
  maximumPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  inclusions?: string[];

  @IsOptional()
  @IsArray()
  exclusions?: string[];

  @IsOptional()
  @IsArray()
  addOns?: {
    name: string;
    description?: string;
    price: number;
    isRequired?: boolean;
  }[];
}

export class CreateServiceDto {
  @IsString()
  vendorId: string;

  @IsString()
  categoryId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  serviceDetails?: {
    duration?: string;
    capacity?: {
      min: number;
      max: number;
    };
    setupTime?: string;
    cleanupTime?: string;
    travelRadius?: number;
    equipmentIncluded?: string[];
    additionalServices?: string[];
    requirements?: string[];
    restrictions?: string[];
  };

  @IsOptional()
  @IsObject()
  availability?: {
    daysOfWeek: string[];
    timeSlots: {
      start: string;
      end: string;
    }[];
    blackoutDates: Date[];
    advanceBookingDays: number;
    minimumNotice: number;
  };

  @IsOptional()
  @IsObject()
  location?: {
    serviceAreas: string[];
    travelFee?: number;
    maxTravelDistance?: number;
    baseLocation?: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      latitude?: number;
      longitude?: number;
    };
  };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicePricingDto)
  pricing?: ServicePricingDto[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}
