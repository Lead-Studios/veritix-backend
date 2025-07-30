import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { HttpModule } from "@nestjs/axios" // For making HTTP requests to external webhooks
import { WebhookController } from "./controllers/webhook.controller"
import { EventChatWebhookController } from "./controllers/event-chat-webhook.controller"
import { ModerationController } from "./controllers/moderation.controller"
import { WebhookService } from "./services/webhook.service"
import { WebhookDispatcherService } from "./services/webhook-dispatcher.service"
import { ModerationService } from "./services/moderation.service"
import { Webhook } from "./entities/webhook.entity"
import { ModerationLog } from "./entities/moderation-log.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, ModerationLog]),
    HttpModule, // Import HttpModule for making external HTTP requests
  ],
  controllers: [WebhookController, EventChatWebhookController, ModerationController],
  providers: [WebhookService, WebhookDispatcherService, ModerationService],
  exports: [WebhookService], // Export if other modules need to interact with it
})
export class WebhookModule {}
