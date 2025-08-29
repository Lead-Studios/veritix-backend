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
import { QuestionService } from '../services/question.service';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';
import { VoteQuestionDto } from '../dto/vote-question.dto';
import { QuestionStatus } from '../entities/question.entity';

@ApiTags('Questions')
@Controller('questions')
@ApiBearerAuth()
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new question' })
  @ApiResponse({ status: 201, description: 'Question submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createQuestionDto: CreateQuestionDto, @Request() req) {
    return this.questionService.create(createQuestionDto, req.user.id, req.user.ownerId);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get all questions for an event' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  @ApiQuery({ name: 'status', enum: QuestionStatus, required: false })
  async findByEvent(
    @Param('eventId') eventId: string,
    @Query('status') status?: QuestionStatus,
    @Request() req?,
  ) {
    if (status) {
      return this.questionService.findByStatus(eventId, status, req?.user?.ownerId);
    }
    return this.questionService.findAll(eventId, req?.user?.ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific question' })
  @ApiResponse({ status: 200, description: 'Question retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.questionService.findOne(id, req.user.ownerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @Request() req,
  ) {
    return this.questionService.update(id, updateQuestionDto, req.user.id, req.user.ownerId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.questionService.remove(id, req.user.id, req.user.ownerId);
    return { message: 'Question deleted successfully' };
  }

  @Post('vote')
  @ApiOperation({ summary: 'Vote on a question' })
  @ApiResponse({ status: 200, description: 'Vote submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async vote(@Body() voteQuestionDto: VoteQuestionDto, @Request() req) {
    return this.questionService.vote(voteQuestionDto, req.user.id, req.user.ownerId);
  }

  @Delete('vote/:questionId')
  @ApiOperation({ summary: 'Remove vote from a question' })
  @ApiResponse({ status: 200, description: 'Vote removed successfully' })
  @ApiResponse({ status: 404, description: 'Vote not found' })
  async removeVote(@Param('questionId') questionId: string, @Request() req) {
    return this.questionService.removeVote(questionId, req.user.id, req.user.ownerId);
  }

  @Patch(':id/moderate')
  @ApiOperation({ summary: 'Moderate a question (approve/reject)' })
  @ApiResponse({ status: 200, description: 'Question moderated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async moderate(
    @Param('id') id: string,
    @Body() body: { status: QuestionStatus; moderationNote?: string },
    @Request() req,
  ) {
    return this.questionService.moderate(
      id,
      body.status,
      body.moderationNote || '',
      req.user.id,
      req.user.ownerId,
    );
  }
}
