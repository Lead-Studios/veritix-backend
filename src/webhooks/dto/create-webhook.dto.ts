import { IsString, IsUrl, IsArray, ArrayNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventType } from '../entities/webhook.entity';

export class CreateWebhookDto {
  @ApiProperty({ description: 'The URL where the webhook payload will be sent.' })
  @IsUrl()
  @IsString()
  url: string;

  @ApiProperty({ description: 'A secret key to sign the webhook payload for verification.', required: false })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ description: 'An array of event types that will trigger this webhook.', enum: WebhookEventType, isArray: true, example: [WebhookEventType.TICKET_CREATED] })
  @IsArray()
  @ArrayNotEmpty()
  eventTypes: WebhookEventType[];

  @ApiProperty({ description: 'Whether the webhook is active or not.', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
