import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignEmailDto } from './create-campaign-email.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class UpdateCampaignEmailDto extends PartialType(CreateCampaignEmailDto) {
  @ApiPropertyOptional({ description: 'Campaign email ID' })
  @IsUUID()
  @IsOptional()
  id?: string;
} 