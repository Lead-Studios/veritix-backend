import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { 
  SocialMediaAnalyticsService,
  SocialMediaDashboard,
  AnalyticsDateRange
} from '../services/social-media-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Social Media Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-media-analytics')
export class SocialMediaAnalyticsController {
  constructor(private readonly analyticsService: SocialMediaAnalyticsService) {}

  @Get('dashboard/:organizerId')
  @ApiOperation({ summary: 'Get social media dashboard overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(
    @Param('organizerId') organizerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SocialMediaDashboard> {
    const dateRange: AnalyticsDateRange | undefined = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getDashboard(organizerId, dateRange);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: 'Get detailed post analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post analytics retrieved successfully',
  })
  async getPostAnalytics(
    @Param('postId') postId: string,
    @Query('includeTimeSeries') includeTimeSeries?: boolean,
  ): Promise<any> {
    return this.analyticsService.getPostAnalytics(postId, includeTimeSeries);
  }

  @Get('campaigns/:campaignId')
  @ApiOperation({ summary: 'Get detailed campaign analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign analytics retrieved successfully',
  })
  async getCampaignAnalytics(
    @Param('campaignId') campaignId: string,
    @Query('includePostBreakdown') includePostBreakdown?: boolean,
  ): Promise<any> {
    return this.analyticsService.getCampaignAnalytics(campaignId, includePostBreakdown);
  }

  @Get('referrals/:programId')
  @ApiOperation({ summary: 'Get referral program analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Referral analytics retrieved successfully',
  })
  async getReferralAnalytics(
    @Param('programId') programId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const dateRange: AnalyticsDateRange | undefined = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getReferralAnalytics(programId, dateRange);
  }

  @Get('influencers/:collaborationId')
  @ApiOperation({ summary: 'Get influencer collaboration analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Influencer analytics retrieved successfully',
  })
  async getInfluencerAnalytics(@Param('collaborationId') collaborationId: string): Promise<any> {
    return this.analyticsService.getInfluencerAnalytics(collaborationId);
  }

  @Get('social-proof/:eventId')
  @ApiOperation({ summary: 'Get social proof analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social proof analytics retrieved successfully',
  })
  async getSocialProofAnalytics(
    @Param('eventId') eventId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const dateRange: AnalyticsDateRange | undefined = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getSocialProofAnalytics(eventId, dateRange);
  }

  @Get('ugc/:eventId')
  @ApiOperation({ summary: 'Get user-generated content analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'UGC analytics retrieved successfully',
  })
  async getUGCAnalytics(
    @Param('eventId') eventId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const dateRange: AnalyticsDateRange | undefined = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getUGCAnalytics(eventId, dateRange);
  }

  @Get('competitors/:organizerId')
  @ApiOperation({ summary: 'Get competitor analysis' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Competitor analysis retrieved successfully',
  })
  async getCompetitorAnalysis(
    @Param('organizerId') organizerId: string,
    @Query('competitors') competitors: string,
  ): Promise<any> {
    const competitorList = competitors ? competitors.split(',') : [];
    return this.analyticsService.getCompetitorAnalysis(organizerId, competitorList);
  }
}
