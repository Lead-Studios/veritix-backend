import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../user/entities/user.entity';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { MLTrainingService } from '../services/ml-training.service';
import { ABTestingService, ExperimentConfig } from '../services/ab-testing.service';
import { UserBehaviorTrackingService } from '../services/user-behavior-tracking.service';

@ApiTags('AI Recommendations Admin')
@Controller('admin/recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ORGANIZER)
@ApiBearerAuth()
export class RecommendationsAdminController {
  constructor(
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly mlTraining: MLTrainingService,
    private readonly abTesting: ABTestingService,
    private readonly behaviorTracking: UserBehaviorTrackingService,
  ) {}

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get recommendation system analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalyticsOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    try {
      const dateRange = {
        start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate) : new Date(),
      };

      const analytics = await this.recommendationEngine.getSystemAnalytics(dateRange);
      return analytics;
    } catch (error) {
      throw new HttpException(
        `Failed to get analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models')
  @ApiOperation({ summary: 'Get all recommendation models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async getModels(): Promise<any> {
    try {
      return this.mlTraining.getModels();
    } catch (error) {
      throw new HttpException(
        `Failed to get models: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('models/train')
  @ApiOperation({ summary: 'Train new recommendation model' })
  @ApiResponse({ status: 201, description: 'Model training started successfully' })
  async trainModel(
    @Body() body: { modelType: 'collaborative' | 'content_based' | 'hybrid'; config?: any },
  ): Promise<{ message: string; modelId: string }> {
    try {
      let modelId: string;

      switch (body.modelType) {
        case 'collaborative':
          modelId = await this.mlTraining.trainCollaborativeModel(body.config);
          break;
        case 'content_based':
          modelId = await this.mlTraining.trainContentBasedModel(body.config);
          break;
        case 'hybrid':
          modelId = await this.mlTraining.trainHybridModel(body.config);
          break;
        default:
          throw new Error('Invalid model type');
      }

      return {
        message: 'Model training started successfully',
        modelId,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to start model training: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('models/:modelId/activate')
  @ApiOperation({ summary: 'Activate a trained model for production use' })
  @ApiResponse({ status: 200, description: 'Model activated successfully' })
  async activateModel(@Param('modelId') modelId: string): Promise<{ message: string }> {
    try {
      await this.mlTraining.activateModel(modelId);
      return { message: 'Model activated successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to activate model: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('experiments')
  @ApiOperation({ summary: 'Get all A/B test experiments' })
  @ApiResponse({ status: 200, description: 'Experiments retrieved successfully' })
  async getExperiments(): Promise<any> {
    try {
      return this.abTesting.getActiveExperiments();
    } catch (error) {
      throw new HttpException(
        `Failed to get experiments: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('experiments')
  @ApiOperation({ summary: 'Create new A/B test experiment' })
  @ApiResponse({ status: 201, description: 'Experiment created successfully' })
  async createExperiment(@Body() config: ExperimentConfig): Promise<any> {
    try {
      const experiment = await this.abTesting.createExperiment(config);
      return experiment;
    } catch (error) {
      throw new HttpException(
        `Failed to create experiment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('experiments/:experimentId/start')
  @ApiOperation({ summary: 'Start an A/B test experiment' })
  @ApiResponse({ status: 200, description: 'Experiment started successfully' })
  async startExperiment(@Param('experimentId') experimentId: string): Promise<{ message: string }> {
    try {
      await this.abTesting.startExperiment(experimentId);
      return { message: 'Experiment started successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to start experiment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('experiments/:experimentId/stop')
  @ApiOperation({ summary: 'Stop an A/B test experiment' })
  @ApiResponse({ status: 200, description: 'Experiment stopped successfully' })
  async stopExperiment(@Param('experimentId') experimentId: string): Promise<any> {
    try {
      await this.abTesting.stopExperiment(experimentId);
      const report = await this.abTesting.getExperimentReport(experimentId);
      return {
        message: 'Experiment stopped successfully',
        report,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to stop experiment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('experiments/:experimentId/report')
  @ApiOperation({ summary: 'Get A/B test experiment report' })
  @ApiResponse({ status: 200, description: 'Experiment report retrieved successfully' })
  async getExperimentReport(@Param('experimentId') experimentId: string): Promise<any> {
    try {
      return this.abTesting.getExperimentReport(experimentId);
    } catch (error) {
      throw new HttpException(
        `Failed to get experiment report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('users/:userId/profile')
  @ApiOperation({ summary: 'Get user recommendation profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getUserProfile(@Param('userId') userId: string): Promise<any> {
    try {
      const preferences = await this.behaviorTracking.getUserPreferences(userId);
      const interactions = await this.behaviorTracking.getUserInteractions(userId, 50);
      const stats = await this.recommendationEngine.getUserRecommendationStats(userId);

      return {
        userId,
        preferences,
        recentInteractions: interactions,
        stats,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get user profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk/generate')
  @ApiOperation({ summary: 'Generate recommendations for all users (bulk operation)' })
  @ApiResponse({ status: 201, description: 'Bulk generation started successfully' })
  async bulkGenerateRecommendations(
    @Body() body: { userIds?: string[]; batchSize?: number },
  ): Promise<{ message: string; jobId: string }> {
    try {
      const jobId = await this.recommendationEngine.bulkGenerateRecommendations(
        body.userIds,
        body.batchSize || 100,
      );

      return {
        message: 'Bulk recommendation generation started',
        jobId,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to start bulk generation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('performance/metrics')
  @ApiOperation({ summary: 'Get recommendation system performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(
    @Query('period') period: string = '7d',
  ): Promise<any> {
    try {
      const metrics = await this.recommendationEngine.getPerformanceMetrics(period);
      return metrics;
    } catch (error) {
      throw new HttpException(
        `Failed to get performance metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('algorithms/comparison')
  @ApiOperation({ summary: 'Compare recommendation algorithm performance' })
  @ApiResponse({ status: 200, description: 'Algorithm comparison retrieved successfully' })
  async compareAlgorithms(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    try {
      const dateRange = {
        start: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate) : new Date(),
      };

      const comparison = await this.recommendationEngine.compareAlgorithmPerformance(dateRange);
      return comparison;
    } catch (error) {
      throw new HttpException(
        `Failed to compare algorithms: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('models/:modelId/retrain')
  @ApiOperation({ summary: 'Retrain existing model with new data' })
  @ApiResponse({ status: 201, description: 'Model retraining started successfully' })
  async retrainModel(
    @Param('modelId') modelId: string,
    @Body() body: { config?: any },
  ): Promise<{ message: string; newModelId: string }> {
    try {
      const newModelId = await this.mlTraining.retrainModel(modelId, body.config);
      return {
        message: 'Model retraining started successfully',
        newModelId,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrain model: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('models/:modelId')
  @ApiOperation({ summary: 'Delete a recommendation model' })
  @ApiResponse({ status: 200, description: 'Model deleted successfully' })
  async deleteModel(@Param('modelId') modelId: string): Promise<{ message: string }> {
    try {
      await this.mlTraining.deleteModel(modelId);
      return { message: 'Model deleted successfully' };
    } catch (error) {
      throw new HttpException(
        `Failed to delete model: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get recommendation system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getSystemHealth(): Promise<any> {
    try {
      const health = await this.recommendationEngine.getSystemHealth();
      return health;
    } catch (error) {
      throw new HttpException(
        `Failed to get system health: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
