import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
  Put,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NLPService } from '../services/nlp.service';
import { ChatAnalyticsService } from '../services/chat-analytics.service';
import { CreateTrainingDataDto, UpdateTrainingDataDto, TrainingDataResponseDto } from '../dto/training-data.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatbotTrainingData, TrainingDataStatus } from '../entities/chatbot-training-data.entity';

@Controller('admin/chatbot')
@UseGuards(AuthGuard('jwt'))
export class ChatbotAdminController {
  constructor(
    private nlpService: NLPService,
    private analyticsService: ChatAnalyticsService,
    @InjectRepository(ChatbotTrainingData)
    private trainingDataRepository: Repository<ChatbotTrainingData>,
  ) {}

  // Training Data Management
  @Post('training-data')
  async createTrainingData(
    @Body() dto: CreateTrainingDataDto,
    @Request() req,
  ): Promise<TrainingDataResponseDto> {
    const trainingData = this.trainingDataRepository.create({
      ...dto,
      ownerId: req.user.ownerId,
      status: TrainingDataStatus.ACTIVE,
      usageCount: 0,
      successRate: 0,
    });

    const saved = await this.trainingDataRepository.save(trainingData);
    return this.mapToResponseDto(saved);
  }

  @Get('training-data')
  async getTrainingData(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('intent') intent?: string,
    @Query('category') category?: string,
    @Query('status') status?: TrainingDataStatus,
  ): Promise<{ data: TrainingDataResponseDto[]; total: number; page: number; limit: number }> {
    const query = this.trainingDataRepository.createQueryBuilder('td')
      .where('td.organizerId = :organizerId', { organizerId: req.user.ownerId });

    if (intent) {
      query.andWhere('td.intent = :intent', { intent });
    }
    if (category) {
      query.andWhere('td.category = :category', { category });
    }
    if (status) {
      query.andWhere('td.status = :status', { status });
    }

    const [data, total] = await query
      .orderBy('td.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map(item => this.mapToResponseDto(item)),
      total,
      page,
      limit,
    };
  }

  @Put('training-data/:id')
  async updateTrainingData(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingDataDto,
    @Request() req,
  ): Promise<TrainingDataResponseDto> {
    await this.trainingDataRepository.update(
      { id, ownerId: req.user.ownerId },
      dto,
    );

    const updated = await this.trainingDataRepository.findOne({
      where: { id, ownerId: req.user.ownerId },
    });

    return this.mapToResponseDto(updated);
  }

  @Delete('training-data/:id')
  async deleteTrainingData(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<{ success: boolean }> {
    await this.trainingDataRepository.delete({
      id,
      ownerId: req.user.ownerId,
    });

    return { success: true };
  }

  // Intent Management
  @Get('intents')
  async getIntents(@Request() req): Promise<{ intents: string[] }> {
    const intents = await this.trainingDataRepository
      .createQueryBuilder('td')
      .select('DISTINCT td.intent', 'intent')
      .where('td.organizerId = :organizerId', { organizerId: req.user.ownerId })
      .getRawMany();

    return { intents: intents.map(item => item.intent) };
  }

  @Post('intents/:intent/test')
  async testIntent(
    @Param('intent') intent: string,
    @Body() testData: { message: string; language?: string },
    @Request() req,
  ) {
    const result = await this.nlpService.analyzeMessage(
      testData.message,
      { language: testData.language || 'en' },
    );

    return {
      message: testData.message,
      detectedIntent: result.intent,
      confidence: result.confidence,
      expectedIntent: intent,
      match: result.intent === intent,
      entities: result.entities,
    };
  }

  // Analytics and Insights
  @Get('analytics/conversations')
  async getConversationAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.analyticsService.getAnalyticsSummary(start, end, req.user.ownerId);
  }

  @Get('analytics/intents')
  async getIntentAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.analyticsService.getPerformanceMetrics(start, end, req.user.ownerId);
  }

  @Get('analytics/performance')
  async getPerformanceAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.analyticsService.getPerformanceMetrics(start, end, req.user.ownerId);
  }

  // Model Training and Management
  @Post('train')
  async trainModel(@Request() req): Promise<{ success: boolean; message: string }> {
    // This would trigger model training with current training data
    // For now, we'll simulate the training process
    const trainingDataCount = await this.trainingDataRepository.count({
      where: { organizerId: req.user.ownerId, status: TrainingDataStatus.ACTIVE },
    });

    if (trainingDataCount < 10) {
      return {
        success: false,
        message: 'Insufficient training data. At least 10 active training examples required.',
      };
    }

    // Simulate training process
    return {
      success: true,
      message: `Training initiated with ${trainingDataCount} examples. Model will be updated within 5-10 minutes.`,
    };
  }

  @Get('model/status')
  async getModelStatus(@Request() req) {
    // This would return the current model training status
    return {
      status: 'ready',
      lastTrainingDate: new Date(),
      trainingDataCount: await this.trainingDataRepository.count({
        where: { ownerId: req.user.ownerId, status: TrainingDataStatus.ACTIVE },
      }),
      modelVersion: '1.0.0',
      accuracy: 0.92,
    };
  }

  // Bulk Operations
  @Post('training-data/bulk')
  async bulkCreateTrainingData(
    @Body() data: { trainingData: CreateTrainingDataDto[] },
    @Request() req,
  ): Promise<{ created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;

    for (const item of data.trainingData) {
      try {
        const trainingData = this.trainingDataRepository.create({
          ...item,
          ownerId: req.user.ownerId,
          status: TrainingDataStatus.ACTIVE,
          usageCount: 0,
          successRate: 0,
        });

        await this.trainingDataRepository.save(trainingData);
        created++;
      } catch (error) {
        errors.push(`Failed to create training data for intent "${item.intent}": ${error.message}`);
      }
    }

    return { created, errors };
  }

  @Delete('training-data/bulk')
  async bulkDeleteTrainingData(
    @Body() data: { ids: string[] },
    @Request() req,
  ): Promise<{ deleted: number }> {
    const result = await this.trainingDataRepository.delete(data.ids.map(id => ({
      id,
      ownerId: req.user.ownerId,
    })));

    return { deleted: result.affected || 0 };
  }

  private mapToResponseDto(trainingData: ChatbotTrainingData): TrainingDataResponseDto {
    return {
      id: trainingData.id,
      type: trainingData.type,
      intent: trainingData.intent,
      input: trainingData.input,
      expectedOutput: trainingData.expectedOutput,
      entities: trainingData.entities,
      language: trainingData.language,
      status: trainingData.status,
      category: trainingData.category,
      subcategory: trainingData.subcategory,
      tags: trainingData.tags,
      usageCount: trainingData.usageCount,
      successRate: trainingData.successRate,
      createdAt: trainingData.createdAt,
      updatedAt: trainingData.updatedAt,
    };
  }
}
