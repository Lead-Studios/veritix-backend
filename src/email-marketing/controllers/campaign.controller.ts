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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CampaignService } from '../services/campaign.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CampaignStatus, CampaignType } from '../entities/email-campaign.entity';

@ApiTags('Email Campaigns')
@Controller('email-marketing/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Create a new email campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async create(@Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignService.create(createCampaignDto);
  }

  @Get()
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get all campaigns with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: CampaignStatus,
    @Query('type') campaignType?: CampaignType,
    @Query('createdBy') createdBy?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    const options = {
      page,
      limit,
      status,
      campaignType,
      createdBy,
      search,
      tags: tags ? tags.split(',') : undefined,
    };
    return this.campaignService.findAll(options);
  }

  @Get(':id')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Update campaign status' })
  @ApiResponse({ status: 200, description: 'Campaign status updated successfully' })
  async updateStatus(@Param('id') id: string, @Body('status') status: CampaignStatus) {
    return this.campaignService.updateStatus(id, status);
  }

  @Post(':id/schedule')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Schedule campaign for future sending' })
  @ApiResponse({ status: 200, description: 'Campaign scheduled successfully' })
  async scheduleCampaign(
    @Param('id') id: string,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.campaignService.scheduleCampaign(id, new Date(scheduledAt));
  }

  @Post(':id/send')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Send campaign immediately' })
  @ApiResponse({ status: 200, description: 'Campaign sent successfully' })
  async sendCampaign(@Param('id') id: string) {
    return this.campaignService.sendCampaign(id);
  }

  @Post(':id/pause')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Pause sending campaign' })
  @ApiResponse({ status: 200, description: 'Campaign paused successfully' })
  async pauseCampaign(@Param('id') id: string) {
    return this.campaignService.pauseCampaign(id);
  }

  @Post(':id/resume')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Resume paused campaign' })
  @ApiResponse({ status: 200, description: 'Campaign resumed successfully' })
  async resumeCampaign(@Param('id') id: string) {
    return this.campaignService.resumeCampaign(id);
  }

  @Get(':id/stats')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiResponse({ status: 200, description: 'Campaign statistics retrieved successfully' })
  async getCampaignStats(@Param('id') id: string) {
    return this.campaignService.getCampaignStats(id);
  }

  @Post(':id/duplicate')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Duplicate campaign' })
  @ApiResponse({ status: 201, description: 'Campaign duplicated successfully' })
  async duplicateCampaign(@Param('id') id: string, @Body('name') name: string) {
    return this.campaignService.duplicateCampaign(id, name);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive campaign' })
  @ApiResponse({ status: 204, description: 'Campaign archived successfully' })
  async remove(@Param('id') id: string) {
    await this.campaignService.remove(id);
  }
}
