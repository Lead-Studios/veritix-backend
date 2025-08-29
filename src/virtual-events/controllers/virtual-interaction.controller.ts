import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VirtualInteractionService } from '../services/virtual-interaction.service';
import { CreateInteractionDto } from '../dto/create-interaction.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InteractionType } from '../enums/virtual-event.enum';

@ApiTags('Virtual Event Interactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('virtual-events/:eventId/interactions')
export class VirtualInteractionController {
  constructor(private readonly virtualInteractionService: VirtualInteractionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new interaction' })
  @ApiResponse({ status: 201, description: 'Interaction created successfully' })
  async create(@Body() createInteractionDto: CreateInteractionDto) {
    return this.virtualInteractionService.createInteraction(createInteractionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get interactions for an event' })
  @ApiResponse({ status: 200, description: 'Interactions retrieved successfully' })
  async getInteractions(
    @Param('eventId') eventId: string,
    @Query('type') type?: InteractionType,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.virtualInteractionService.getInteractions(eventId, type, limit, offset);
  }

  @Get('chat')
  @ApiOperation({ summary: 'Get chat messages' })
  @ApiResponse({ status: 200, description: 'Chat messages retrieved successfully' })
  async getChatMessages(
    @Param('eventId') eventId: string,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ) {
    return this.virtualInteractionService.getChatMessages(eventId, limit, offset);
  }

  @Get('qa')
  @ApiOperation({ summary: 'Get Q&A questions' })
  @ApiResponse({ status: 200, description: 'Q&A questions retrieved successfully' })
  async getQAQuestions(
    @Param('eventId') eventId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.virtualInteractionService.getQAQuestions(eventId, limit, offset);
  }

  @Get('polls/:pollId/responses')
  @ApiOperation({ summary: 'Get poll responses' })
  @ApiResponse({ status: 200, description: 'Poll responses retrieved successfully' })
  async getPollResponses(@Param('eventId') eventId: string, @Param('pollId') pollId: string) {
    return this.virtualInteractionService.getPollResponses(eventId, pollId);
  }

  @Patch(':interactionId/moderate')
  @ApiOperation({ summary: 'Moderate an interaction' })
  @ApiResponse({ status: 200, description: 'Interaction moderated successfully' })
  async moderateInteraction(
    @Param('interactionId') interactionId: string,
    @Body() moderationData: { moderatorId: string; isApproved: boolean; moderationNote?: string },
  ) {
    return this.virtualInteractionService.moderateInteraction(
      interactionId,
      moderationData.moderatorId,
      moderationData.isApproved,
      moderationData.moderationNote,
    );
  }

  @Patch(':interactionId/highlight')
  @ApiOperation({ summary: 'Highlight an interaction' })
  @ApiResponse({ status: 200, description: 'Interaction highlighted successfully' })
  async highlightInteraction(@Param('interactionId') interactionId: string) {
    return this.virtualInteractionService.highlightInteraction(interactionId);
  }

  @Post(':interactionId/like')
  @ApiOperation({ summary: 'Like an interaction' })
  @ApiResponse({ status: 200, description: 'Interaction liked successfully' })
  async likeInteraction(@Param('interactionId') interactionId: string, @Body() likeData: { userId: string }) {
    return this.virtualInteractionService.likeInteraction(interactionId, likeData.userId);
  }

  @Post(':interactionId/reply')
  @ApiOperation({ summary: 'Reply to an interaction' })
  @ApiResponse({ status: 201, description: 'Reply created successfully' })
  async replyToInteraction(
    @Param('interactionId') interactionId: string,
    @Body() createInteractionDto: CreateInteractionDto,
  ) {
    return this.virtualInteractionService.replyToInteraction(interactionId, createInteractionDto);
  }

  @Delete(':interactionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an interaction' })
  @ApiResponse({ status: 204, description: 'Interaction deleted successfully' })
  async deleteInteraction(@Param('interactionId') interactionId: string, @Body() deleteData: { userId: string }) {
    return this.virtualInteractionService.deleteInteraction(interactionId, deleteData.userId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get interaction analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@Param('eventId') eventId: string) {
    return this.virtualInteractionService.getInteractionAnalytics(eventId);
  }
}
