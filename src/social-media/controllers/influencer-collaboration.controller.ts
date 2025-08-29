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
import { InfluencerCollaboration } from '../entities/influencer-collaboration.entity';
import { 
  InfluencerCollaborationService,
  CreateInfluencerCollaborationDto,
  UpdateCollaborationDto,
  CollaborationMessage
} from '../services/influencer-collaboration.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Influencer Collaborations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('influencer-collaborations')
export class InfluencerCollaborationController {
  constructor(private readonly collaborationService: InfluencerCollaborationService) {}

  @Post()
  @ApiOperation({ summary: 'Create new influencer collaboration' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Collaboration created successfully',
    type: InfluencerCollaboration,
  })
  async createCollaboration(@Body() dto: CreateInfluencerCollaborationDto): Promise<InfluencerCollaboration> {
    return this.collaborationService.createCollaboration(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get collaboration by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaboration retrieved successfully',
    type: InfluencerCollaboration,
  })
  async getCollaboration(@Param('id') id: string): Promise<InfluencerCollaboration> {
    return this.collaborationService.findCollaborationById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get collaborations with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaborations retrieved successfully',
    type: [InfluencerCollaboration],
  })
  async getCollaborations(
    @Query('organizerId') organizerId?: string,
    @Query('influencerId') influencerId?: string,
    @Query('eventId') eventId?: string,
  ): Promise<InfluencerCollaboration[]> {
    if (organizerId) {
      return this.collaborationService.findCollaborationsByOrganizer(organizerId);
    }
    if (influencerId) {
      return this.collaborationService.findCollaborationsByInfluencer(influencerId);
    }
    if (eventId) {
      return this.collaborationService.findCollaborationsByEvent(eventId);
    }
    return [];
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update collaboration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaboration updated successfully',
    type: InfluencerCollaboration,
  })
  async updateCollaboration(
    @Param('id') id: string,
    @Body() dto: UpdateCollaborationDto,
  ): Promise<InfluencerCollaboration> {
    return this.collaborationService.updateCollaboration(id, dto);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Send collaboration invitation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation sent successfully',
    type: InfluencerCollaboration,
  })
  async inviteInfluencer(@Param('id') id: string): Promise<InfluencerCollaboration> {
    return this.collaborationService.inviteInfluencer(id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept collaboration invitation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaboration accepted successfully',
    type: InfluencerCollaboration,
  })
  async acceptCollaboration(@Param('id') id: string): Promise<InfluencerCollaboration> {
    return this.collaborationService.acceptCollaboration(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject collaboration invitation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaboration rejected successfully',
    type: InfluencerCollaboration,
  })
  async rejectCollaboration(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ): Promise<InfluencerCollaboration> {
    return this.collaborationService.rejectCollaboration(id, body.reason);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start active collaboration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaboration started successfully',
    type: InfluencerCollaboration,
  })
  async startCollaboration(@Param('id') id: string): Promise<InfluencerCollaboration> {
    return this.collaborationService.startCollaboration(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete collaboration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaboration completed successfully',
    type: InfluencerCollaboration,
  })
  async completeCollaboration(@Param('id') id: string): Promise<InfluencerCollaboration> {
    return this.collaborationService.completeCollaboration(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add message to collaboration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message added successfully',
    type: InfluencerCollaboration,
  })
  async addMessage(
    @Param('id') id: string,
    @Body() message: CollaborationMessage,
  ): Promise<InfluencerCollaboration> {
    return this.collaborationService.addMessage(id, message);
  }

  @Put(':id/deliverables/:index')
  @ApiOperation({ summary: 'Update deliverable status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deliverable updated successfully',
    type: InfluencerCollaboration,
  })
  async updateDeliverable(
    @Param('id') id: string,
    @Param('index') index: number,
    @Body() updates: {
      status?: string;
      postUrl?: string;
      submittedAt?: Date;
      approvedAt?: Date;
    },
  ): Promise<InfluencerCollaboration> {
    return this.collaborationService.updateDeliverable(id, index, updates);
  }

  @Put(':id/performance')
  @ApiOperation({ summary: 'Update performance metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics updated successfully',
    type: InfluencerCollaboration,
  })
  async updatePerformance(
    @Param('id') id: string,
    @Body() metrics: {
      reach?: number;
      impressions?: number;
      engagement?: number;
      clicks?: number;
      conversions?: number;
      mentions?: number;
      hashtags?: Record<string, number>;
      sentiment?: {
        positive: number;
        negative: number;
        neutral: number;
      };
    },
  ): Promise<InfluencerCollaboration> {
    return this.collaborationService.updatePerformanceMetrics(id, metrics);
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Rate completed collaboration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaboration rated successfully',
    type: InfluencerCollaboration,
  })
  async rateCollaboration(
    @Param('id') id: string,
    @Body() body: { rating: number; feedback?: string },
  ): Promise<InfluencerCollaboration> {
    return this.collaborationService.rateCollaboration(id, body.rating, body.feedback);
  }

  @Get('analytics/:organizerId')
  @ApiOperation({ summary: 'Get collaboration analytics for organizer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics retrieved successfully',
  })
  async getAnalytics(
    @Param('organizerId') organizerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.collaborationService.getCollaborationAnalytics(organizerId, dateRange);
  }

  @Get('influencers/search')
  @ApiOperation({ summary: 'Search for influencers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Influencers found successfully',
  })
  async searchInfluencers(
    @Query('tier') tier?: string,
    @Query('platforms') platforms?: string,
    @Query('minFollowers') minFollowers?: number,
    @Query('maxFollowers') maxFollowers?: number,
    @Query('interests') interests?: string,
    @Query('location') location?: string,
    @Query('minEngagementRate') minEngagementRate?: number,
    @Query('maxBudget') maxBudget?: number,
  ): Promise<any[]> {
    const criteria = {
      tier: tier as any,
      platforms: platforms ? platforms.split(',') : undefined,
      minFollowers,
      maxFollowers,
      interests: interests ? interests.split(',') : undefined,
      location,
      minEngagementRate,
      maxBudget,
    };

    return this.collaborationService.searchInfluencers(criteria);
  }

  @Get('influencers/tier/:tier')
  @ApiOperation({ summary: 'Get influencers by tier' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Influencers retrieved successfully',
  })
  async getInfluencersByTier(
    @Param('tier') tier: string,
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.collaborationService.findInfluencersByTier(tier as any, limit || 50);
  }

  @Get(':id/contract')
  @ApiOperation({ summary: 'Generate collaboration contract' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contract generated successfully',
  })
  async generateContract(@Param('id') id: string): Promise<{ contract: string }> {
    const contract = await this.collaborationService.generateCollaborationContract(id);
    return { contract };
  }
}
