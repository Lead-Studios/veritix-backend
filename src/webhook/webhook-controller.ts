import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookRegistrationDto } from './webhook-registration.dto';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  registerWebhook(@Body() dto: WebhookRegistrationDto) {
    return this.webhookService.registerWebhook(dto);
  }
}
