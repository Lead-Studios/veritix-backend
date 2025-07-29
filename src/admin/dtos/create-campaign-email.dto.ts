import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateCampaignEmailDto {
  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsArray()
  @ArrayNotEmpty()
  recipients: string[];
} 