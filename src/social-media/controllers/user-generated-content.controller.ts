import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserGeneratedContent, ContentStatus } from '../entities/user-generated-content.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export interface CreateUGCDto {
  eventId?: string;
  userId?: string;
  campaignId?: string;
  organizerId?: string;
  contentType: string;
  title: string;
  description: string;
  mediaUrls: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
  }>;
  authorName: string;
  authorUsername?: string;
  authorEmail?: string;
  authorAvatarUrl?: string;
  platform?: string;
  originalUrl?: string;
  platformPostId?: string;
  hashtags?: string[];
  mentions?: Array<{
    username: string;
    userId?: string;
    displayName?: string;
  }>;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  };
  permissions?: {
    canRepost?: boolean;
    canFeature?: boolean;
    canModify?: boolean;
    canCommercialUse?: boolean;
    attribution?: string;
    expiresAt?: Date;
  };
}

// Mock service for demonstration
class UserGeneratedContentService {
  async create(dto: CreateUGCDto): Promise<UserGeneratedContent> {
    return {} as UserGeneratedContent;
  }

  async findById(id: string): Promise<UserGeneratedContent> {
    return {} as UserGeneratedContent;
  }

  async findByEvent(eventId: string, status?: ContentStatus): Promise<UserGeneratedContent[]> {
    return [];
  }

  async findByCampaign(campaignId: string): Promise<UserGeneratedContent[]> {
    return [];
  }

  async findByUser(userId: string): Promise<UserGeneratedContent[]> {
    return [];
  }

  async updateStatus(id: string, status: ContentStatus): Promise<UserGeneratedContent> {
    return {} as UserGeneratedContent;
  }

  async moderate(id: string, action: 'approve' | 'reject' | 'flag', reason?: string): Promise<UserGeneratedContent> {
    return {} as UserGeneratedContent;
  }

  async feature(id: string, featuredUntil?: Date): Promise<UserGeneratedContent> {
    return {} as UserGeneratedContent;
  }

  async updateEngagement(id: string, engagement: any): Promise<UserGeneratedContent> {
    return {} as UserGeneratedContent;
  }

  async getAnalytics(eventId: string, dateRange?: any): Promise<any> {
    return {};
  }

  async searchContent(filters: any): Promise<UserGeneratedContent[]> {
    return [];
  }
}

@ApiTags('User Generated Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-generated-content')
export class UserGeneratedContentController {
  constructor(private readonly ugcService: UserGeneratedContentService) {}

  @Post()
  @ApiOperation({ summary: 'Submit user-generated content' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'UGC submitted successfully',
    type: UserGeneratedContent,
  })
  async submitContent(@Body() dto: CreateUGCDto): Promise<UserGeneratedContent> {
    return this.ugcService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get UGC by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'UGC retrieved successfully',
    type: UserGeneratedContent,
  })
  async getContent(@Param('id') id: string): Promise<UserGeneratedContent> {
    return this.ugcService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get UGC with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'UGC retrieved successfully',
    type: [UserGeneratedContent],
  })
  async getContent(
    @Query('eventId') eventId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: ContentStatus,
    @Query('contentType') contentType?: string,
    @Query('platform') platform?: string,
    @Query('featured') featured?: boolean,
  ): Promise<UserGeneratedContent[]> {
    if (eventId) {
      return this.ugcService.findByEvent(eventId, status);
    }
    if (campaignId) {
      return this.ugcService.findByCampaign(campaignId);
    }
    if (userId) {
      return this.ugcService.findByUser(userId);
    }

    // Search with filters
    const filters = {
      status,
      contentType,
      platform,
      featured,
    };

    return this.ugcService.searchContent(filters);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update UGC status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'UGC status updated successfully',
    type: UserGeneratedContent,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ContentStatus },
  ): Promise<UserGeneratedContent> {
    return this.ugcService.updateStatus(id, body.status);
  }

  @Post(':id/moderate')
  @ApiOperation({ summary: 'Moderate UGC content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'UGC moderated successfully',
    type: UserGeneratedContent,
  })
  async moderateContent(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' | 'flag'; reason?: string },
  ): Promise<UserGeneratedContent> {
    return this.ugcService.moderate(id, body.action, body.reason);
  }

  @Post(':id/feature')
  @ApiOperation({ summary: 'Feature UGC content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'UGC featured successfully',
    type: UserGeneratedContent,
  })
  async featureContent(
    @Param('id') id: string,
    @Body() body: { featuredUntil?: Date },
  ): Promise<UserGeneratedContent> {
    return this.ugcService.feature(id, body.featuredUntil);
  }

  @Put(':id/engagement')
  @ApiOperation({ summary: 'Update UGC engagement metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Engagement metrics updated successfully',
    type: UserGeneratedContent,
  })
  async updateEngagement(
    @Param('id') id: string,
    @Body() engagement: {
      likes?: number;
      comments?: number;
      shares?: number;
      saves?: number;
      views?: number;
      reach?: number;
      impressions?: number;
    },
  ): Promise<UserGeneratedContent> {
    return this.ugcService.updateEngagement(id, engagement);
  }

  @Get('analytics/:eventId')
  @ApiOperation({ summary: 'Get UGC analytics for event' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'UGC analytics retrieved successfully',
  })
  async getAnalytics(
    @Param('eventId') eventId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.ugcService.getAnalytics(eventId, dateRange);
  }
}
