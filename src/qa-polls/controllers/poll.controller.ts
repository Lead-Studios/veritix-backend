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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PollService } from '../services/poll.service';
import { CreatePollDto } from '../dto/create-poll.dto';
import { UpdatePollDto } from '../dto/update-poll.dto';
import { VotePollDto } from '../dto/vote-poll.dto';
import { PollStatus } from '../entities/poll.entity';

@ApiTags('Polls')
@Controller('polls')
@ApiBearerAuth()
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new poll' })
  @ApiResponse({ status: 201, description: 'Poll created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createPollDto: CreatePollDto, @Request() req) {
    return this.pollService.create(createPollDto, req.user.id, req.user.ownerId);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get all polls for an event' })
  @ApiResponse({ status: 200, description: 'Polls retrieved successfully' })
  @ApiQuery({ name: 'status', enum: PollStatus, required: false })
  @ApiQuery({ name: 'active', type: Boolean, required: false })
  async findByEvent(
    @Param('eventId') eventId: string,
    @Query('status') status?: PollStatus,
    @Query('active') active?: boolean,
    @Request() req?,
  ) {
    if (active === true) {
      return this.pollService.findActive(eventId, req?.user?.ownerId);
    }
    if (status) {
      return this.pollService.findByStatus(eventId, status, req?.user?.ownerId);
    }
    return this.pollService.findAll(eventId, req?.user?.ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific poll' })
  @ApiResponse({ status: 200, description: 'Poll retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.pollService.findOne(id, req.user.ownerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a poll' })
  @ApiResponse({ status: 200, description: 'Poll updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePollDto: UpdatePollDto,
    @Request() req,
  ) {
    return this.pollService.update(id, updatePollDto, req.user.id, req.user.ownerId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a poll' })
  @ApiResponse({ status: 200, description: 'Poll deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.pollService.remove(id, req.user.id, req.user.ownerId);
    return { message: 'Poll deleted successfully' };
  }

  @Post('vote')
  @ApiOperation({ summary: 'Vote in a poll' })
  @ApiResponse({ status: 200, description: 'Vote submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async vote(@Body() votePollDto: VotePollDto, @Request() req) {
    return this.pollService.vote(votePollDto, req.user.id, req.user.ownerId);
  }

  @Get(':id/my-vote')
  @ApiOperation({ summary: 'Get user\'s vote for a poll' })
  @ApiResponse({ status: 200, description: 'User vote retrieved successfully' })
  async getUserVote(@Param('id') id: string, @Request() req) {
    return this.pollService.getUserVote(id, req.user.id, req.user.ownerId);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get poll results' })
  @ApiResponse({ status: 200, description: 'Poll results retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Results not available' })
  async getResults(@Param('id') id: string, @Request() req) {
    return this.pollService.getPollResults(id, req.user.id, req.user.ownerId);
  }

  @Patch(':id/moderate')
  @ApiOperation({ summary: 'Moderate a poll (approve/reject)' })
  @ApiResponse({ status: 200, description: 'Poll moderated successfully' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async moderate(
    @Param('id') id: string,
    @Body() body: { status: PollStatus; moderationNote?: string },
    @Request() req,
  ) {
    return this.pollService.moderate(
      id,
      body.status,
      body.moderationNote || '',
      req.user.id,
      req.user.ownerId,
    );
  }
}
