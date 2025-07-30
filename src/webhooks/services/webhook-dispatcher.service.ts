import { Injectable, Logger } from "@nestjs/common"
import type { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"
import { type Webhook, WebhookType, WebhookEventType, WebhookStatus } from "../entities/webhook.entity"
import { ChatMessageDto } from "../dto/webhook.dto"

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name)

  constructor(private readonly httpService: HttpService) {}

  async dispatch(webhook: Webhook, eventType: WebhookEventType, payload: any): Promise<boolean> {
    if (webhook.status !== WebhookStatus.ACTIVE) {
      this.logger.warn(`Webhook ${webhook.id} is not active. Skipping dispatch.`)
      return false
    }

    const formattedPayload = this.formatPayload(webhook.type, eventType, payload)

    try {
      this.logger.debug(`Dispatching event ${eventType} to webhook ${webhook.id} (${webhook.url})`)
      await firstValueFrom(this.httpService.post(webhook.url, formattedPayload))
      this.logger.log(`Successfully dispatched event ${eventType} to webhook ${webhook.id}.`)
      return true
    } catch (error) {
      this.logger.error(
        `Failed to dispatch event ${eventType} to webhook ${webhook.id} (${webhook.url}): ${error.message}`,
        error.response?.data || error.stack,
      )
      // In a real application, you might want to implement a retry mechanism
      // and/or mark the webhook as FAILED after a certain number of retries.
      return false
    }
  }

  private formatPayload(type: WebhookType, eventType: WebhookEventType, data: any): any {
    switch (type) {
      case WebhookType.SLACK:
        return this.formatSlackPayload(eventType, data)
      case WebhookType.DISCORD:
        return this.formatDiscordPayload(eventType, data)
      case WebhookType.CUSTOM:
        return this.formatCustomPayload(eventType, data)
      default:
        this.logger.warn(`Unknown webhook type: ${type}. Sending raw payload.`)
        return data
    }
  }

  private formatSlackPayload(eventType: WebhookEventType, data: any): any {
    let text = `New event: *${eventType.replace(/_/g, " ").toUpperCase()}*`
    const attachments: any[] = []

    if (eventType === WebhookEventType.MESSAGE_SENT && data instanceof ChatMessageDto) {
      text = `*New Chat Message in Event ${data.eventId}*`
      attachments.push({
        color: "#36a64f",
        author_name: `User: ${data.userId}`,
        title: `Message ID: ${data.messageId || "N/A"}`,
        text: data.content,
        footer: `Sent at ${new Date(data.timestamp).toLocaleString()}`,
      })
    } else if (eventType === WebhookEventType.USER_JOINED) {
      text = `*User Joined Event ${data.eventId}*`
      attachments.push({
        color: "#439FE0",
        text: `User ${data.userId} has joined the event chat.`,
        footer: `At ${new Date(data.timestamp).toLocaleString()}`,
      })
    } else if (eventType === WebhookEventType.MESSAGE_FLAGGED) {
      text = `*Moderation Alert: Message Flagged in Event ${data.eventId}*`
      attachments.push({
        color: "#FF0000",
        title: `Message ID: ${data.messageId || "N/A"}`,
        text: `Content: "${data.content}"\nReason: ${data.reason || "N/A"}\nFlagged by: ${data.moderatedBy}`,
        footer: `Flagged at ${new Date(data.timestamp).toLocaleString()}`,
      })
    }
    // Add more event type formatting as needed

    return { text, attachments }
  }

  private formatDiscordPayload(eventType: WebhookEventType, data: any): any {
    const embed: any = {
      title: `Event: ${eventType.replace(/_/g, " ").toUpperCase()}`,
      timestamp: new Date().toISOString(),
      color: 0x0099ff, // Default blue
    }

    if (eventType === WebhookEventType.MESSAGE_SENT && data instanceof ChatMessageDto) {
      embed.title = `New Chat Message in Event ${data.eventId}`
      embed.description = data.content
      embed.fields = [
        { name: "User ID", value: data.userId, inline: true },
        { name: "Message ID", value: data.messageId || "N/A", inline: true },
      ]
      embed.color = 0x00ff00 // Green
    } else if (eventType === WebhookEventType.USER_JOINED) {
      embed.title = `User Joined Event ${data.eventId}`
      embed.description = `User <@${data.userId}> has joined the event chat.`
      embed.color = 0x0000ff // Blue
    } else if (eventType === WebhookEventType.MESSAGE_FLAGGED) {
      embed.title = `Moderation Alert: Message Flagged in Event ${data.eventId}`
      embed.description = `Message: "${data.content}"`
      embed.fields = [
        { name: "Reason", value: data.reason || "N/A", inline: false },
        { name: "Flagged By", value: data.moderatedBy, inline: true },
        { name: "Message ID", value: data.messageId || "N/A", inline: true },
      ]
      embed.color = 0xff0000 // Red
    }
    // Add more event type formatting as needed

    return { embeds: [embed] }
  }

  private formatCustomPayload(eventType: WebhookEventType, data: any): any {
    // For custom webhooks, you might just send the raw data or a generic wrapper
    return {
      eventType: eventType,
      data: data,
      timestamp: new Date().toISOString(),
    }
  }
}
