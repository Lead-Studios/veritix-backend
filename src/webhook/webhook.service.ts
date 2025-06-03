import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Webhook } from './webhook.entity';
import { Repository } from 'typeorm';
import axios from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
  ) {}

  async registerWebhook(data: { organizerId: number; events: string[]; callbackUrl: string; }) {
    const webhook = this.webhookRepository.create(data);
    return this.webhookRepository.save(webhook);
  }

  async triggerEvent(event: string, payload: any) {
    const webhooks = await this.webhookRepository
      .createQueryBuilder('webhook')
      .where(':event = ANY(string_to_array(webhook.events, \',\'))', { event })
      .getMany();

    for (const webhook of webhooks) {
      this.sendWithRetry(webhook.callbackUrl, payload, 0);
    }
  }

  private async sendWithRetry(url: string, payload: any, attempt: number) {
    const maxRetries = 3;
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
      await axios.post(url, payload, { timeout: 5000 });
      this.logger.log(`Webhook POST to ${url} succeeded`);
    } catch (error) {
      this.logger.warn(`Webhook POST to ${url} failed on attempt ${attempt + 1}: ${error.message}`);
      if (attempt < maxRetries) {
        const backoff = 2 ** attempt * 1000; // exponential backoff
        await delay(backoff);
        await this.sendWithRetry(url, payload, attempt + 1);
      } else {
        this.logger.error(`Webhook POST to ${url} failed after ${maxRetries} attempts.`);
      }
    }
  }
}
