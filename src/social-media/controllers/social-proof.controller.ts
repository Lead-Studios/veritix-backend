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
import { SocialProof } from '../entities/social-proof.entity';
import { 
  SocialProofService, 
  CreateSocialProofDto,
  SocialProofWidget 
} from '../services/social-proof.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Social Proof')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-proof')
export class SocialProofController {
  constructor(private readonly socialProofService: SocialProofService) {}

  @Post()
  @ApiOperation({ summary: 'Create social proof entry' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Social proof created successfully',
    type: SocialProof,
  })
  async createProof(@Body() dto: CreateSocialProofDto): Promise<SocialProof> {
    return this.socialProofService.createSocialProof(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get social proof by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social proof retrieved successfully',
    type: SocialProof,
  })
  async getProof(@Param('id') id: string): Promise<SocialProof> {
    return this.socialProofService.findProofById(id);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get social proof for event' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event social proof retrieved successfully',
    type: [SocialProof],
  })
  async getEventProofs(
    @Param('eventId') eventId: string,
    @Query('types') types?: string,
    @Query('limit') limit?: number,
  ): Promise<SocialProof[]> {
    const proofTypes = types ? types.split(',') as any[] : undefined;
    return this.socialProofService.findProofsByEvent(eventId, proofTypes, limit || 50);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve social proof' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social proof approved successfully',
    type: SocialProof,
  })
  async approveProof(@Param('id') id: string): Promise<SocialProof> {
    return this.socialProofService.approveProof(id);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject social proof' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social proof rejected successfully',
    type: SocialProof,
  })
  async rejectProof(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ): Promise<SocialProof> {
    return this.socialProofService.rejectProof(id, body.reason);
  }

  @Post(':id/display')
  @ApiOperation({ summary: 'Track social proof display' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Display tracked successfully',
  })
  async trackDisplay(@Param('id') id: string): Promise<void> {
    return this.socialProofService.trackProofDisplay(id);
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'Track social proof click' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Click tracked successfully',
  })
  async trackClick(@Param('id') id: string): Promise<void> {
    return this.socialProofService.trackProofClick(id);
  }

  @Get('widgets/friend-attendance/:eventId')
  @ApiOperation({ summary: 'Get friend attendance widget data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Friend attendance widget data retrieved successfully',
  })
  async getFriendAttendanceWidget(
    @Param('eventId') eventId: string,
    @Query('userId') userId: string,
    @Query('limit') limit?: number,
  ): Promise<SocialProofWidget> {
    return this.socialProofService.getFriendAttendanceProof(eventId, userId, limit || 10);
  }

  @Get('widgets/recent-activity/:eventId')
  @ApiOperation({ summary: 'Get recent activity widget data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent activity widget data retrieved successfully',
  })
  async getRecentActivityWidget(
    @Param('eventId') eventId: string,
    @Query('limit') limit?: number,
  ): Promise<SocialProofWidget> {
    return this.socialProofService.getRecentActivityProof(eventId, limit || 5);
  }

  @Get('widgets/testimonials/:eventId')
  @ApiOperation({ summary: 'Get testimonials widget data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Testimonials widget data retrieved successfully',
  })
  async getTestimonialsWidget(
    @Param('eventId') eventId: string,
    @Query('limit') limit?: number,
  ): Promise<SocialProofWidget> {
    return this.socialProofService.getTestimonialsWidget(eventId, limit || 3);
  }

  @Get('widgets/user-count/:eventId')
  @ApiOperation({ summary: 'Get user count widget data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User count widget data retrieved successfully',
  })
  async getUserCountWidget(@Param('eventId') eventId: string): Promise<SocialProofWidget> {
    return this.socialProofService.getUserCountWidget(eventId);
  }

  @Get('analytics/:eventId')
  @ApiOperation({ summary: 'Get social proof analytics for event' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Social proof analytics retrieved successfully',
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

    return this.socialProofService.getProofAnalytics(eventId, dateRange);
  }

  @Post('sync-ugc/:eventId')
  @ApiOperation({ summary: 'Sync user-generated content to social proof' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'UGC synced to social proof successfully',
  })
  async syncUGC(@Param('eventId') eventId: string): Promise<void> {
    return this.socialProofService.syncUserGeneratedContent(eventId);
  }
}
