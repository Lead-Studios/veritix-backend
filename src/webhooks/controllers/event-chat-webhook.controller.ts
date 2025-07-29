import { Controller, Post, HttpCode, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { WebhookService } from "../services/webhook.service"
import type { ChatMessageDto } from "../dto/webhook.dto"
import { WebhookEventType } from "../entities/webhook.entity"

@ApiTags("Event Chat Webhook (Internal)")
@Controller("internal/event-chat")
export class EventChatWebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post("message")
  @HttpCode(HttpStatus.ACCEPTED) // Accepted because processing is asynchronous
  @ApiOperation({
    summary: "Receive a chat message from the event chat system for webhook processing",
    description: "This endpoint is intended to be called by your internal event chat service.",
  })
  @ApiResponse({ status: 202, description: "Message accepted for processing" })
  @ApiResponse({ status: 400, description: "Invalid message data" })
  async receiveChatMessage(messageDto: ChatMessageDto): Promise<void> {
    // In a real system, you might want to add a queue here (e.g., RabbitMQ, Kafka)
    // to handle messages asynchronously and ensure delivery.
    this.webhookService.handleIncomingChatMessage(messageDto)
    // No need to await, as dispatching is fire-and-forget for this endpoint
  }

  @Post("user-joined")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Notify webhooks when a user joins an event chat",
    description: "This endpoint is intended to be called by your internal event chat service.",
  })
  @ApiResponse({ status: 202, description: "User join event accepted for processing" })
  @ApiResponse({ status: 400, description: "Invalid data" })
  async userJoined(payload: { eventId: string; userId: string; timestamp?: string }): Promise<void> {
    this.webhookService.handleEventNotification(payload.eventId, WebhookEventType.USER_JOINED, payload)
  }

  @Post("user-left")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Notify webhooks when a user leaves an event chat",
    description: "This endpoint is intended to be called by your internal event chat service.",
  })
  @ApiResponse({ status: 202, description: "User left event accepted for processing" })
  @ApiResponse({ status: 400, description: "Invalid data" })
  async userLeft(payload: { eventId: string; userId: string; timestamp?: string }): Promise<void> {
    this.webhookService.handleEventNotification(payload.eventId, WebhookEventType.USER_LEFT, payload)
  }

  // Add more internal endpoints for other event types (e.g., message_deleted)
}
