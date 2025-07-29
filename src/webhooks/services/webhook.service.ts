import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type Webhook, WebhookEventType, WebhookStatus } from "../entities/webhook.entity"
import type { ModerationLog, ModerationActionType } from "../entities/moderation-log.entity"
import type { CreateWebhookDto, UpdateWebhookDto, ChatMessageDto, ModerationActionDto } from "../dto/webhook.dto"
import type { WebhookDispatcherService } from "./webhook-dispatcher.service"
import type { ModerationService } from "./moderation.service"

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name)

  constructor(
    private webhookRepository: Repository<Webhook>,
    private moderationLogRepository: Repository<ModerationLog>,
    private webhookDispatcherService: WebhookDispatcherService,
    private moderationService: ModerationService,
  ) {}

  /**
   * Creates a new webhook configuration.
   * @param createDto Data for the new webhook.
   * @returns The created Webhook entity.
   */
  async createWebhook(createDto: CreateWebhookDto): Promise<Webhook> {
    const webhook = this.webhookRepository.create(createDto)
    const savedWebhook = await this.webhookRepository.save(webhook)
    this.logger.log(`Webhook ${savedWebhook.id} created for event ${savedWebhook.eventId}.`)
    return savedWebhook
  }

  /**
   * Updates an existing webhook configuration.
   * @param id The ID of the webhook to update.
   * @param updateDto Data to update.
   * @returns The updated Webhook entity.
   */
  async updateWebhook(id: string, updateDto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({ where: { id } })
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found.`)
    }

    Object.assign(webhook, updateDto)
    const updatedWebhook = await this.webhookRepository.save(webhook)
    this.logger.log(`Webhook ${updatedWebhook.id} updated.`)
    return updatedWebhook
  }

  /**
   * Deletes a webhook configuration.
   * @param id The ID of the webhook to delete.
   */
  async deleteWebhook(id: string): Promise<void> {
    const result = await this.webhookRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`Webhook with ID ${id} not found.`)
    }
    this.logger.log(`Webhook ${id} deleted.`)
  }

  /**
   * Retrieves a single webhook by its ID.
   * @param id The ID of the webhook.
   * @returns The Webhook entity.
   */
  async getWebhook(id: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({ where: { id } })
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found.`)
    }
    return webhook
  }

  /**
   * Retrieves all webhooks for a given event.
   * @param eventId The ID of the event.
   * @returns An array of Webhook entities.
   */
  async getWebhooksByEvent(eventId: string): Promise<Webhook[]> {
    return this.webhookRepository.find({ where: { eventId }, order: { createdAt: "ASC" } })
  }

  /**
   * Handles an incoming chat message from the event chat system.
   * This is the primary entry point for chat events.
   * @param messageDto The chat message data.
   * @returns True if the message was processed and potentially dispatched, false otherwise.
   */
  async handleIncomingChatMessage(messageDto: ChatMessageDto): Promise<boolean> {
    this.logger.debug(`Received chat message for event ${messageDto.eventId} from user ${messageDto.userId}.`)

    // Find webhooks for this event that listen to MESSAGE_SENT
    const webhooks = await this.webhookRepository.find({
      where: {
        eventId: messageDto.eventId,
        status: WebhookStatus.ACTIVE,
      },
    })

    let processed = false
    for (const webhook of webhooks) {
      if (webhook.events.includes(WebhookEventType.MESSAGE_SENT)) {
        let shouldDispatch = true
        let moderationReason: string | undefined

        if (webhook.moderationEnabled) {
          const moderationResult = await this.moderationService.moderateMessage(messageDto)
          shouldDispatch = moderationResult.passed
          moderationReason = moderationResult.reason
        }

        if (shouldDispatch) {
          // Dispatch asynchronously to avoid blocking
          this.webhookDispatcherService.dispatch(webhook, WebhookEventType.MESSAGE_SENT, messageDto)
          processed = true
        } else {
          this.logger.warn(
            `Message ${messageDto.messageId || "N/A"} blocked by moderation for webhook ${webhook.id}. Reason: ${moderationReason}`,
          )
          // Optionally, dispatch a "message_blocked" event to a specific moderation webhook
          // this.webhookDispatcherService.dispatch(webhook, WebhookEventType.MESSAGE_BLOCKED, { ...messageDto, reason: moderationReason });
        }
      }
    }
    return processed
  }

  /**
   * Handles other event-related notifications (e.g., user joined/left).
   * @param eventId The ID of the event.
   * @param eventType The type of event (e.g., USER_JOINED).
   * @param payload The data associated with the event.
   */
  async handleEventNotification(eventId: string, eventType: WebhookEventType, payload: any): Promise<boolean> {
    this.logger.debug(`Received event notification: ${eventType} for event ${eventId}.`)

    const webhooks = await this.webhookRepository.find({
      where: {
        eventId: eventId,
        status: WebhookStatus.ACTIVE,
      },
    })

    let dispatched = false
    for (const webhook of webhooks) {
      if (webhook.events.includes(eventType)) {
        // Dispatch asynchronously
        this.webhookDispatcherService.dispatch(webhook, eventType, payload)
        dispatched = true
      }
    }
    return dispatched
  }

  /**
   * Performs a moderation action and logs it.
   * @param actionDto Details of the moderation action.
   * @returns The created ModerationLog entity.
   */
  async performModerationAction(actionDto: ModerationActionDto): Promise<ModerationLog> {
    const log = await this.moderationService.logModerationAction(actionDto)

    // Optionally, dispatch a webhook event for moderation actions
    this.handleEventNotification(actionDto.eventId, WebhookEventType.MESSAGE_FLAGGED, {
      ...actionDto,
      timestamp: log.timestamp.toISOString(),
    }) // Assuming MESSAGE_FLAGGED can be used for all moderation types for simplicity

    return log
  }

  /**
   * Retrieves moderation logs for an event.
   * @param eventId The ID of the event.
   * @param action Optional filter by action type.
   * @returns An array of ModerationLog entities.
   */
  async getModerationLogs(eventId: string, action?: ModerationActionType): Promise<ModerationLog[]> {
    return this.moderationService.getModerationLogs(eventId, action)
  }
}
