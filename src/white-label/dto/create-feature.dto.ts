import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsNumber, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeatureCategory } from '../entities/tenant-feature.entity';

export class CreateFeatureDto {
  @ApiProperty({ description: 'Feature key (unique identifier)' })
  @IsString()
  featureKey: string;

  @ApiProperty({ description: 'Human-readable feature name' })
  @IsString()
  featureName: string;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FeatureCategory, description: 'Feature category' })
  @IsEnum(FeatureCategory)
  category: FeatureCategory;

  @ApiPropertyOptional({ description: 'Is feature enabled', default: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean = false;

  @ApiPropertyOptional({ description: 'Feature configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Feature limits' })
  @IsOptional()
  @IsObject()
  limits?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Feature expiration date' })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'User who enabled the feature' })
  @IsOptional()
  @IsString()
  enabledBy?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
