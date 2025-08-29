import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';
import { TenantStatus } from '../entities/tenant.entity';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @ApiPropertyOptional({ enum: TenantStatus, description: 'Tenant status' })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ description: 'Suspension reason' })
  @IsOptional()
  @IsString()
  suspensionReason?: string;

  @ApiPropertyOptional({ description: 'Trial end date' })
  @IsOptional()
  @IsDate()
  trialEndsAt?: Date;
}
