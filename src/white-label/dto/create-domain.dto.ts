import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainType } from '../entities/tenant-domain.entity';

export class CreateDomainDto {
  @ApiProperty({ description: 'Domain name' })
  @IsString()
  domain: string;

  @ApiProperty({ enum: DomainType, description: 'Domain type' })
  @IsEnum(DomainType)
  type: DomainType;

  @ApiPropertyOptional({ description: 'Is primary domain', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;

  @ApiPropertyOptional({ description: 'SSL enabled', default: false })
  @IsOptional()
  @IsBoolean()
  sslEnabled?: boolean = false;

  @ApiPropertyOptional({ description: 'SSL certificate' })
  @IsOptional()
  @IsString()
  sslCertificate?: string;

  @ApiPropertyOptional({ description: 'DNS records configuration' })
  @IsOptional()
  @IsObject()
  dnsRecords?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
