import { IsString, IsEmail, IsEnum, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantTier } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unique slug for tenant' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: 'Tenant description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Primary contact email' })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiProperty({ enum: TenantTier, description: 'Tenant tier' })
  @IsEnum(TenantTier)
  tier: TenantTier;

  @ApiPropertyOptional({ description: 'Maximum number of users', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number = 100;

  @ApiPropertyOptional({ description: 'Maximum number of events', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxEvents?: number = 50;

  @ApiPropertyOptional({ description: 'Maximum number of tickets', default: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTickets?: number = 10000;

  @ApiPropertyOptional({ description: 'Maximum storage in MB', default: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStorage?: number = 5000;

  @ApiPropertyOptional({ description: 'Custom domain support', default: false })
  @IsOptional()
  @IsBoolean()
  customDomainEnabled?: boolean = false;

  @ApiPropertyOptional({ description: 'SSO support', default: false })
  @IsOptional()
  @IsBoolean()
  ssoEnabled?: boolean = false;

  @ApiPropertyOptional({ description: 'API access', default: false })
  @IsOptional()
  @IsBoolean()
  apiAccessEnabled?: boolean = false;

  @ApiPropertyOptional({ description: 'White-label support', default: false })
  @IsOptional()
  @IsBoolean()
  whiteLabelEnabled?: boolean = false;

  @ApiPropertyOptional({ description: 'Priority support', default: false })
  @IsOptional()
  @IsBoolean()
  prioritySupportEnabled?: boolean = false;

  @ApiPropertyOptional({ description: 'SLA uptime percentage', default: 99.9 })
  @IsOptional()
  @IsNumber()
  @Min(90)
  @Max(100)
  slaUptimePercent?: number = 99.9;
}
