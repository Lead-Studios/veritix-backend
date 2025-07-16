import { IsUUID, IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from "class-validator"

export class TrackViewDto {
  @IsUUID()
  eventId: string

  @IsOptional()
  @IsUUID()
  userId?: string

  @IsOptional()
  @IsString()
  trafficSource?: string

  @IsOptional()
  @IsString()
  referrerUrl?: string

  @IsOptional()
  @IsString()
  utmSource?: string

  @IsOptional()
  @IsString()
  utmMedium?: string

  @IsOptional()
  @IsString()
  utmCampaign?: string

  @IsOptional()
  @IsString()
  utmTerm?: string

  @IsOptional()
  @IsString()
  utmContent?: string

  @IsOptional()
  @IsString()
  userAgent?: string

  @IsOptional()
  @IsString()
  deviceType?: string

  @IsOptional()
  @IsString()
  browser?: string

  @IsOptional()
  @IsString()
  operatingSystem?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(86400) // Max 24 hours
  timeOnPage?: number

  @IsOptional()
  @IsBoolean()
  convertedToPurchase?: boolean

  @IsOptional()
  @IsUUID()
  purchaseId?: string

  @IsOptional()
  @IsString()
  ipAddress?: string
}
