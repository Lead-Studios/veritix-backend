import { IsString, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class UpdateSponsorDto {
  @IsOptional()
  @IsString()
  brandImage?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsUrl()
  brandWebsite?: string;

  @IsOptional()
  @IsUrl()
  facebook?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  instagram?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;
} 