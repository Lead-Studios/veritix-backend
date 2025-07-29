import { IsUUID } from 'class-validator';

export class DeleteCampaignEmailDto {
  @IsUUID()
  id: string;
} 