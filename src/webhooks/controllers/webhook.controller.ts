import { Controller, Post, Get, Patch, Delete, Param, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger"
import type { WebhookService } from "../services/webhook.service"
import { type CreateWebhookDto, type UpdateWebhookDto, WebhookDto } from "../dto/webhook.dto"

@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @ApiOperation({ summary: "Create a new webhook configuration" })
  @ApiResponse({
    status: 201,
    description: "Webhook created successfully",
    type: WebhookDto,
  })
  @ApiResponse({ status: 400, description: "Invalid data" })
  async create(createDto: CreateWebhookDto): Promise<WebhookDto> {
    return this.webhookService.createWebhook(createDto)
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an existing webhook configuration" })
  @ApiResponse({
    status: 200,
    description: "Webhook updated successfully",
    type: WebhookDto,
  })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  @ApiResponse({ status: 400, description: "Invalid update data" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the webhook to update" })
  async update(@Param("id", ParseUUIDPipe) id: string, updateDto: UpdateWebhookDto): Promise<WebhookDto> {
    return this.webhookService.updateWebhook(id, updateDto)
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a webhook configuration" })
  @ApiResponse({ status: 204, description: "Webhook deleted successfully" })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the webhook to delete" })
  async delete(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.webhookService.deleteWebhook(id)
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a webhook by ID" })
  @ApiResponse({
    status: 200,
    description: "Webhook retrieved successfully",
    type: WebhookDto,
  })
  @ApiResponse({ status: 404, description: "Webhook not found" })
  @ApiParam({ name: "id", type: "string", format: "uuid", description: "ID of the webhook" })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<WebhookDto> {
    return this.webhookService.getWebhook(id)
  }

  @Get("event/:eventId")
  @ApiOperation({ summary: "Get all webhooks for a specific event" })
  @ApiResponse({
    status: 200,
    description: "List of webhooks retrieved successfully",
    type: [WebhookDto],
  })
  @ApiParam({ name: "eventId", type: "string", format: "uuid", description: "ID of the event" })
  async findByEvent(@Param("eventId", ParseUUIDPipe) eventId: string): Promise<WebhookDto[]> {
    return this.webhookService.getWebhooksByEvent(eventId)
  }
}
