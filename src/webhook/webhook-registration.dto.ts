import { IsNumber, IsString, IsArray, ArrayNotEmpty, IsUrl } from 'class-validator';

export class WebhookRegistrationDto {
  @IsNumber()
  organizerId: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events: string[];

  @IsUrl()
  callbackUrl: string;
}
