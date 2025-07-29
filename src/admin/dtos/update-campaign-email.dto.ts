import { IsUUID, IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateCampaignEmailDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  recipients?: string[];

  @IsOptional()
  @IsString()
  status?: string;
} 