import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ModerationLog, ModerationActionType } from "../entities/moderation-log.entity"
import type { ChatMessageDto, ModerationActionDto } from "../dto/webhook.dto"

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name)
  private readonly forbiddenWords = ["badword1", "badword2", "hate_speech"] // Example list

  constructor(private moderationLogRepository: Repository<ModerationLog>) {}

  /**
   * Performs automated moderation on a chat message.
   * @param message The chat message to moderate.
   * @returns True if the message passes moderation, false if it should be blocked.
   */
  async moderateMessage(message: ChatMessageDto): Promise<{ passed: boolean; reason?: string }> {
    const contentLower = message.content.toLowerCase()

    // 1. Keyword filtering
    for (const word of this.forbiddenWords) {
      if (contentLower.includes(word)) {
        const reason = `Contains forbidden word: '${word}'`
        await this.logModerationAction({
          eventId: message.eventId,
          messageId: message.messageId,
          userId: message.userId,
          action: ModerationActionType.FLAGGED,
          reason: reason,
          moderatedBy: "system-keyword-filter",
        })
        this.logger.warn(`Message from user ${message.userId} flagged: ${reason}`)
        return { passed: false, reason }
      }
    }

    // 2. (Placeholder) Sentiment analysis
    // const sentimentScore = await this.sentimentAnalyzer.analyze(message.content);
    // if (sentimentScore < -0.5) { // Example threshold
    //   await this.logModerationAction({ ... });
    //   return { passed: false, reason: "Negative sentiment" };
    // }

    // 3. (Placeholder) Spam detection
    // if (this.spamDetector.isSpam(message.content)) { ... }

    this.logger.debug(`Message from user ${message.userId} passed automated moderation.`)
    return { passed: true }
  }

  /**
   * Logs a manual or automated moderation action.
   * @param actionDto Details of the moderation action.
   * @returns The created ModerationLog entity.
   */
  async logModerationAction(actionDto: ModerationActionDto): Promise<ModerationLog> {
    const log = this.moderationLogRepository.create(actionDto)
    const savedLog = await this.moderationLogRepository.save(log)
    this.logger.log(
      `Moderation action logged: ${actionDto.action} for event ${actionDto.eventId}` +
        (actionDto.messageId ? ` message ${actionDto.messageId}` : "") +
        (actionDto.userId ? ` user ${actionDto.userId}` : "") +
        (actionDto.reason ? ` (Reason: ${actionDto.reason})` : ""),
    )
    return savedLog
  }

  /**
   * Retrieves moderation logs for an event.
   * @param eventId The ID of the event.
   * @param action Optional filter by action type.
   * @returns An array of ModerationLog entities.
   */
  async getModerationLogs(eventId: string, action?: ModerationActionType): Promise<ModerationLog[]> {
    const where: any = { eventId }
    if (action) {
      where.action = action
    }
    return this.moderationLogRepository.find({ where, order: { timestamp: "DESC" } })
  }
}
