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
import { SocialPost } from '../entities/social-post.entity';
import { SocialPostService, CreateSocialPostDto, UpdateSocialPostDto } from '../services/social-post.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Social Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-posts')
export class SocialPostController {
  constructor(private readonly socialPostService: SocialPostService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new social media post' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Social post created successfully',
    type: SocialPost,
  })
  async createPost(@Body() dto: CreateSocialPostDto): Promise<SocialPost> {
    return this.socialPostService.createPost(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get social post by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social post retrieved successfully',
    type: SocialPost,
  })
  async getPost(@Param('id') id: string): Promise<SocialPost> {
    return this.socialPostService.findPostById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get social posts with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social posts retrieved successfully',
    type: [SocialPost],
  })
  async getPosts(
    @Query('accountId') accountId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('eventId') eventId?: string,
  ): Promise<SocialPost[]> {
    if (accountId) {
      return this.socialPostService.findPostsByAccount(accountId);
    }
    if (campaignId) {
      return this.socialPostService.findPostsByCampaign(campaignId);
    }
    if (eventId) {
      return this.socialPostService.findPostsByEvent(eventId);
    }
    return [];
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update social post' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social post updated successfully',
    type: SocialPost,
  })
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdateSocialPostDto,
  ): Promise<SocialPost> {
    return this.socialPostService.updatePost(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete social post' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Social post deleted successfully',
  })
  async deletePost(@Param('id') id: string): Promise<void> {
    return this.socialPostService.deletePost(id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish social post immediately' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social post published successfully',
    type: SocialPost,
  })
  async publishPost(@Param('id') id: string): Promise<SocialPost> {
    return this.socialPostService.publishPost(id);
  }

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Schedule social post for later' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social post scheduled successfully',
    type: SocialPost,
  })
  async schedulePost(
    @Param('id') id: string,
    @Body() body: { scheduledFor: Date },
  ): Promise<SocialPost> {
    return this.socialPostService.schedulePost(id, body.scheduledFor);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate social post' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Social post duplicated successfully',
    type: SocialPost,
  })
  async duplicatePost(@Param('id') id: string): Promise<SocialPost> {
    return this.socialPostService.duplicatePost(id);
  }

  @Put(':id/engagement')
  @ApiOperation({ summary: 'Update engagement metrics for post' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Engagement metrics updated successfully',
    type: SocialPost,
  })
  async updateEngagement(@Param('id') id: string): Promise<SocialPost> {
    return this.socialPostService.updateEngagementMetrics(id);
  }

  @Post('generate-content')
  @ApiOperation({ summary: 'Generate AI content for social post' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI content generated successfully',
  })
  async generateContent(
    @Body() body: {
      prompt: string;
      postType: string;
      platform: string;
      eventContext?: any;
    },
  ): Promise<{
    content: string;
    hashtags: string[];
    confidence: number;
    suggestions: string[];
  }> {
    return this.socialPostService.generateAIContent(
      body.prompt,
      body.postType as any,
      body.platform,
      body.eventContext,
    );
  }

  @Get('optimize-timing/:accountId')
  @ApiOperation({ summary: 'Get optimal posting times for account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimal posting times retrieved successfully',
  })
  async getOptimalTiming(
    @Param('accountId') accountId: string,
    @Query('postType') postType: string,
  ): Promise<Date[]> {
    return this.socialPostService.optimizePostTiming(accountId, postType as any);
  }
}
