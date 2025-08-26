import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber, IsDateString, ValidateNested, IsEmail, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { PassType, PassStyle } from '../entities/wallet-pass.entity';
import { UpdateType } from '../entities/pass-update.entity';

export class CreatePassDto {
  @ApiProperty({ description: 'Ticket ID to create pass for' })
  @IsString()
  ticketId: string;

  @ApiProperty({ enum: PassType, description: 'Type of wallet pass' })
  @IsEnum(PassType)
  passType: PassType;

  @ApiPropertyOptional({ description: 'Template ID to use for pass generation' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Custom pass data' })
  @IsOptional()
  @IsObject()
  customData?: any;
}

export class UpdatePassDto {
  @ApiProperty({ enum: UpdateType, description: 'Type of update to perform' })
  @IsEnum(UpdateType)
  updateType: UpdateType;

  @ApiProperty({ description: 'Update data' })
  @IsObject()
  updateData: any;

  @ApiPropertyOptional({ description: 'Schedule update for later' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({ description: 'Update priority' })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class SharePassDto {
  @ApiProperty({ description: 'Email addresses to share with', type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  shareWithEmails: string[];

  @ApiPropertyOptional({ description: 'Phone numbers to share with', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shareWithPhones?: string[];

  @ApiPropertyOptional({ description: 'Custom share message' })
  @IsOptional()
  @IsString()
  shareMessage?: string;

  @ApiPropertyOptional({ description: 'Share expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Allow recipients to forward the pass' })
  @IsOptional()
  @IsBoolean()
  allowForwarding?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of shares allowed' })
  @IsOptional()
  @IsNumber()
  maxShares?: number;
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PassType, description: 'Pass type for this template' })
  @IsEnum(PassType)
  passType: PassType;

  @ApiProperty({ enum: PassStyle, description: 'Pass style' })
  @IsEnum(PassStyle)
  passStyle: PassStyle;

  @ApiProperty({ description: 'Pass type identifier' })
  @IsString()
  passTypeIdentifier: string;

  @ApiProperty({ description: 'Team identifier' })
  @IsString()
  teamIdentifier: string;

  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiProperty({ description: 'Appearance configuration' })
  @IsObject()
  appearance: {
    backgroundColor: string;
    foregroundColor: string;
    labelColor: string;
    logoText?: string;
    stripImage?: string;
    thumbnailImage?: string;
    backgroundImage?: string;
    footerImage?: string;
    iconImage?: string;
  };

  @ApiProperty({ description: 'Field templates configuration' })
  @IsObject()
  fieldTemplates: {
    headerFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
    primaryFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
    secondaryFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
    auxiliaryFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
    backFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
  };

  @ApiPropertyOptional({ description: 'Barcode settings' })
  @IsOptional()
  @IsObject()
  barcodeSettings?: {
    format: 'PKBarcodeFormatQR' | 'PKBarcodeFormatPDF417' | 'PKBarcodeFormatAztec' | 'PKBarcodeFormatCode128';
    messageTemplate: string;
    altText?: string;
  };

  @ApiPropertyOptional({ description: 'Location settings' })
  @IsOptional()
  @IsObject()
  locationSettings?: {
    enabled: boolean;
    defaultLocations: Array<{
      latitude: number;
      longitude: number;
      altitude?: number;
      relevantText?: string;
    }>;
    useEventLocation: boolean;
  };

  @ApiPropertyOptional({ description: 'Beacon settings' })
  @IsOptional()
  @IsObject()
  beaconSettings?: {
    enabled: boolean;
    beacons: Array<{
      proximityUUID: string;
      major?: number;
      minor?: number;
      relevantText?: string;
    }>;
  };

  @ApiPropertyOptional({ description: 'Notification settings' })
  @IsOptional()
  @IsObject()
  notificationSettings?: {
    relevantDateEnabled: boolean;
    relevantDateOffset: number;
    locationNotifications: boolean;
    beaconNotifications: boolean;
  };

  @ApiPropertyOptional({ description: 'Sharing settings' })
  @IsOptional()
  @IsObject()
  sharingSettings?: {
    allowSharing: boolean;
    shareMessage?: string;
    maxShares?: number;
  };

  @ApiPropertyOptional({ description: 'Web service settings' })
  @IsOptional()
  @IsObject()
  webServiceSettings?: {
    webServiceURL?: string;
    authenticationToken?: string;
  };

  @ApiPropertyOptional({ description: 'Associated apps configuration' })
  @IsOptional()
  @IsObject()
  associatedApps?: {
    storeIdentifiers?: number[];
    appLaunchURL?: string;
  };

  @ApiPropertyOptional({ description: 'Customization options' })
  @IsOptional()
  @IsObject()
  customization?: {
    allowCustomColors: boolean;
    allowCustomImages: boolean;
    allowCustomFields: boolean;
    maxCustomFields: number;
  };

  @ApiPropertyOptional({ description: 'Validation rules' })
  @IsOptional()
  @IsObject()
  validation?: {
    requiredFields: string[];
    fieldValidation: Record<string, {
      type: 'string' | 'number' | 'date' | 'email' | 'url';
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    }>;
  };

  @ApiPropertyOptional({ description: 'Set as default template' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Template status' })
  @IsOptional()
  @IsEnum(['draft', 'active', 'inactive', 'archived'])
  status?: 'draft' | 'active' | 'inactive' | 'archived';

  @ApiPropertyOptional({ description: 'Appearance configuration' })
  @IsOptional()
  @IsObject()
  appearance?: any;

  @ApiPropertyOptional({ description: 'Field templates configuration' })
  @IsOptional()
  @IsObject()
  fieldTemplates?: any;

  @ApiPropertyOptional({ description: 'Barcode settings' })
  @IsOptional()
  @IsObject()
  barcodeSettings?: any;

  @ApiPropertyOptional({ description: 'Location settings' })
  @IsOptional()
  @IsObject()
  locationSettings?: any;

  @ApiPropertyOptional({ description: 'Beacon settings' })
  @IsOptional()
  @IsObject()
  beaconSettings?: any;

  @ApiPropertyOptional({ description: 'Notification settings' })
  @IsOptional()
  @IsObject()
  notificationSettings?: any;

  @ApiPropertyOptional({ description: 'Sharing settings' })
  @IsOptional()
  @IsObject()
  sharingSettings?: any;

  @ApiPropertyOptional({ description: 'Web service settings' })
  @IsOptional()
  @IsObject()
  webServiceSettings?: any;

  @ApiPropertyOptional({ description: 'Associated apps configuration' })
  @IsOptional()
  @IsObject()
  associatedApps?: any;

  @ApiPropertyOptional({ description: 'Customization options' })
  @IsOptional()
  @IsObject()
  customization?: any;

  @ApiPropertyOptional({ description: 'Validation rules' })
  @IsOptional()
  @IsObject()
  validation?: any;

  @ApiPropertyOptional({ description: 'Set as default template' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class LocationTriggerDto {
  @ApiProperty({ description: 'Pass ID that triggered the location event' })
  @IsString()
  passId: string;

  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Location accuracy in meters' })
  @IsNumber()
  accuracy: number;

  @ApiPropertyOptional({ description: 'Device identifier' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class BeaconTriggerDto {
  @ApiProperty({ description: 'Pass ID that triggered the beacon event' })
  @IsString()
  passId: string;

  @ApiProperty({ description: 'Beacon proximity UUID' })
  @IsString()
  proximityUUID: string;

  @ApiPropertyOptional({ description: 'Beacon major identifier' })
  @IsOptional()
  @IsNumber()
  major?: number;

  @ApiPropertyOptional({ description: 'Beacon minor identifier' })
  @IsOptional()
  @IsNumber()
  minor?: number;

  @ApiProperty({ description: 'Proximity level', enum: ['immediate', 'near', 'far'] })
  @IsEnum(['immediate', 'near', 'far'])
  proximity: 'immediate' | 'near' | 'far';

  @ApiProperty({ description: 'Received signal strength indicator' })
  @IsNumber()
  rssi: number;

  @ApiPropertyOptional({ description: 'Device identifier' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class QRValidationDto {
  @ApiProperty({ description: 'QR code data to validate' })
  @IsString()
  qrData: string;

  @ApiPropertyOptional({ description: 'Location where QR code was scanned' })
  @IsOptional()
  @IsString()
  scanLocation?: string;
}

export class BulkCreatePassesDto {
  @ApiProperty({ description: 'Array of ticket IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ticketIds: string[];

  @ApiProperty({ enum: PassType, description: 'Type of wallet passes to create' })
  @IsEnum(PassType)
  passType: PassType;

  @ApiPropertyOptional({ description: 'Template ID to use for all passes' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Custom data for all passes' })
  @IsOptional()
  @IsObject()
  customData?: any;
}

export class BulkUpdatePassesDto {
  @ApiProperty({ description: 'Array of pass IDs to update', type: [String] })
  @IsArray()
  @IsString({ each: true })
  passIds: string[];

  @ApiProperty({ description: 'Update data to apply to all passes' })
  @IsObject()
  updateData: any;

  @ApiPropertyOptional({ description: 'Schedule updates for later' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({ description: 'Update priority' })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class BulkSharePassesDto {
  @ApiProperty({ description: 'Array of pass IDs to share', type: [String] })
  @IsArray()
  @IsString({ each: true })
  passIds: string[];

  @ApiProperty({ description: 'Email addresses to share with', type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  shareWithEmails: string[];

  @ApiPropertyOptional({ description: 'Custom share message' })
  @IsOptional()
  @IsString()
  shareMessage?: string;

  @ApiPropertyOptional({ description: 'Share expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Allow recipients to forward passes' })
  @IsOptional()
  @IsBoolean()
  allowForwarding?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of shares per pass' })
  @IsOptional()
  @IsNumber()
  maxShares?: number;
}

export class GeofenceConfigDto {
  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Geofence radius in meters' })
  @IsNumber()
  radius: number;

  @ApiPropertyOptional({ description: 'Relevant text for location trigger' })
  @IsOptional()
  @IsString()
  relevantText?: string;

  @ApiPropertyOptional({ description: 'Notification title' })
  @IsOptional()
  @IsString()
  notificationTitle?: string;

  @ApiPropertyOptional({ description: 'Notification body' })
  @IsOptional()
  @IsString()
  notificationBody?: string;

  @ApiPropertyOptional({ description: 'Trigger on entry' })
  @IsOptional()
  @IsBoolean()
  triggerOnEntry?: boolean;

  @ApiPropertyOptional({ description: 'Trigger on exit' })
  @IsOptional()
  @IsBoolean()
  triggerOnExit?: boolean;

  @ApiPropertyOptional({ description: 'Cooldown period in minutes' })
  @IsOptional()
  @IsNumber()
  cooldownPeriod?: number;
}

export class ConfigureGeofencesDto {
  @ApiProperty({ description: 'Pass ID to configure geofences for' })
  @IsString()
  passId: string;

  @ApiProperty({ description: 'Array of geofence configurations', type: [GeofenceConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeofenceConfigDto)
  geofences: GeofenceConfigDto[];
}

export class BeaconConfigDto {
  @ApiProperty({ description: 'Beacon proximity UUID' })
  @IsString()
  proximityUUID: string;

  @ApiPropertyOptional({ description: 'Beacon major identifier' })
  @IsOptional()
  @IsNumber()
  major?: number;

  @ApiPropertyOptional({ description: 'Beacon minor identifier' })
  @IsOptional()
  @IsNumber()
  minor?: number;

  @ApiPropertyOptional({ description: 'Relevant text for beacon trigger' })
  @IsOptional()
  @IsString()
  relevantText?: string;
}

export class ConfigureBeaconsDto {
  @ApiProperty({ description: 'Pass ID to configure beacons for' })
  @IsString()
  passId: string;

  @ApiProperty({ description: 'Array of beacon configurations', type: [BeaconConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BeaconConfigDto)
  beacons: BeaconConfigDto[];
}

export class NotificationPreferencesDto {
  @ApiProperty({ description: 'Enable location-based notifications' })
  @IsBoolean()
  enableLocationNotifications: boolean;

  @ApiProperty({ description: 'Enable beacon-based notifications' })
  @IsBoolean()
  enableBeaconNotifications: boolean;

  @ApiPropertyOptional({ description: 'Quiet hours start time (HH:MM)' })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end time (HH:MM)' })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @ApiPropertyOptional({ description: 'Maximum notifications per day' })
  @IsOptional()
  @IsNumber()
  maxNotificationsPerDay?: number;

  @ApiProperty({ description: 'Notification channels', type: [String] })
  @IsArray()
  @IsEnum(['push', 'sms', 'email'], { each: true })
  notificationChannels: ('push' | 'sms' | 'email')[];
}

export class QRCodeOptionsDto {
  @ApiPropertyOptional({ description: 'QR code size in pixels' })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({ description: 'QR code margin' })
  @IsOptional()
  @IsNumber()
  margin?: number;

  @ApiPropertyOptional({ description: 'QR code colors' })
  @IsOptional()
  @IsObject()
  color?: {
    dark?: string;
    light?: string;
  };

  @ApiPropertyOptional({ description: 'Error correction level' })
  @IsOptional()
  @IsEnum(['L', 'M', 'Q', 'H'])
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';

  @ApiPropertyOptional({ description: 'Image type' })
  @IsOptional()
  @IsEnum(['image/png', 'image/jpeg', 'image/webp'])
  type?: 'image/png' | 'image/jpeg' | 'image/webp';

  @ApiPropertyOptional({ description: 'Image quality (0-1)' })
  @IsOptional()
  @IsNumber()
  quality?: number;
}

export class BatchQRGenerationDto {
  @ApiProperty({ description: 'Array of pass IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  passIds: string[];

  @ApiPropertyOptional({ description: 'QR code generation options' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QRCodeOptionsDto)
  options?: QRCodeOptionsDto;
}

export class AnalyticsTimeRangeDto {
  @ApiPropertyOptional({ description: 'Start date for analytics range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for analytics range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExportAnalyticsDto extends AnalyticsTimeRangeDto {
  @ApiPropertyOptional({ description: 'Export format', enum: ['json', 'csv'] })
  @IsOptional()
  @IsEnum(['json', 'csv'])
  format?: 'json' | 'csv';

  @ApiPropertyOptional({ description: 'Include detailed data' })
  @IsOptional()
  @IsBoolean()
  includeDetails?: boolean;
}

// Response DTOs

export class PassCreationResponseDto {
  @ApiProperty({ description: 'Creation success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Pass download URL for Apple Wallet' })
  downloadUrl?: string;

  @ApiPropertyOptional({ description: 'Save URL for Google Pay' })
  saveUrl?: string;

  @ApiPropertyOptional({ description: 'Pass data' })
  passData?: any;

  @ApiPropertyOptional({ description: 'Error message if creation failed' })
  error?: string;
}

export class BulkOperationResponseDto {
  @ApiProperty({ description: 'Overall operation success' })
  success: boolean;

  @ApiProperty({ description: 'Individual operation results' })
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;

  @ApiProperty({ description: 'Operation summary' })
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export class QRValidationResponseDto {
  @ApiProperty({ description: 'Validation success status' })
  isValid: boolean;

  @ApiPropertyOptional({ description: 'Decoded QR data' })
  data?: any;

  @ApiPropertyOptional({ description: 'Ticket information' })
  ticketInfo?: {
    ticketId: string;
    eventId: string;
    userId: string;
    passId: string;
    eventName: string;
    userName: string;
    seatInfo?: string;
  };

  @ApiPropertyOptional({ description: 'Validation error message' })
  error?: string;
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({ description: 'Total number of passes' })
  totalPasses: number;

  @ApiProperty({ description: 'Number of active passes' })
  activePassesCount: number;

  @ApiProperty({ description: 'Passes created today' })
  passesCreatedToday: number;

  @ApiProperty({ description: 'Passes created this week' })
  passesCreatedThisWeek: number;

  @ApiProperty({ description: 'Passes created this month' })
  passesCreatedThisMonth: number;

  @ApiProperty({ description: 'Pass status breakdown' })
  passStatusBreakdown: Record<string, number>;

  @ApiProperty({ description: 'Pass type breakdown' })
  passTypeBreakdown: Record<string, number>;

  @ApiProperty({ description: 'Installation conversion rate' })
  conversionRate: number;

  @ApiProperty({ description: 'Average pass lifetime in days' })
  averagePassLifetime: number;
}
