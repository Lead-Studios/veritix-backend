import { Controller, Post, Get, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger"
import type { WebhookService } from "../services/webhook.service"
import { type ModerationActionDto, ModerationLogDto } from "../dto/webhook.dto"
import { ModerationActionType } from "../entities/moderation-log.entity"

@ApiTags("Moderation")
@Controller("moderation")
export class ModerationController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post("action")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Perform and log a moderation action" })
  @ApiResponse({
    status: 201,
    description: "Moderation action logged successfully",
    type: ModerationLogDto,
  })
  @ApiResponse({ status: 400, description: "Invalid moderation action data" })
  async performAction(actionDto: ModerationActionDto): Promise<ModerationLogDto> {
    // In a real application, ensure 'moderatedBy' is derived from authenticated user
    return this.webhookService.performModerationAction(actionDto)
  }

  @Get("logs/:eventId")
  @ApiOperation({ summary: "Get moderation logs for an event" })
  @ApiResponse({
    status: 200,
    description: "Moderation logs retrieved successfully",
    type: [ModerationLogDto],
  })
  @ApiParam({ name: "eventId", type: "string", format: "uuid", description: "ID of the event" })
  @ApiQuery({
    name: "action",
    enum: ModerationActionType,
    required: false,
    description: "Filter logs by moderation action type",
  })
  async getLogs(
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Query("action") action?: ModerationActionType,
  ): Promise<ModerationLogDto[]> {
    return this.webhookService.getModerationLogs(eventId, action)
  }
}
