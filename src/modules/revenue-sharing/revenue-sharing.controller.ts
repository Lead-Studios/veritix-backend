import { Controller, Get, Post, Param, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { RevenueSharingService, RevenueBreakdown } from './revenue-sharing.service';
import { RevenueShareRule, RevenueShareType } from './revenue-sharing.entity';

class DefineRevenueSplitDto {
  splits: { 
    stakeholderId: string; 
    shareType: RevenueShareType; 
    shareValue: number 
  }[];
}

@ApiTags('Revenue Sharing')
@Controller('revenue-sharing')
export class RevenueSharingController {
  private readonly logger = new Logger(RevenueSharingController.name);

  constructor(private readonly revenueSharingService: RevenueSharingService) {}

  @Post('events/:eventId/splits')
  @ApiOperation({ summary: 'Define revenue split rules for an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiBody({ type: DefineRevenueSplitDto })
  @ApiResponse({ status: 201, description: 'Revenue split rules defined successfully' })
  async defineRevenueSplit(
    @Param('eventId') eventId: string,
    @Body() dto: DefineRevenueSplitDto,
  ): Promise<RevenueShareRule[]> {
    this.logger.log(`Defining revenue split for event ${eventId}`);
    return this.revenueSharingService.defineRevenueSplit(eventId, dto.splits);
  }

  @Post('events/:eventId/distribute')
  @ApiOperation({ summary: 'Distribute revenue automatically after ticket sales' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Revenue distributed successfully' })
  async distributeRevenue(
    @Param('eventId') eventId: string,
    @Body('totalRevenue') totalRevenue: number,
  ): Promise<RevenueBreakdown> {
    this.logger.log(`Distributing revenue for event ${eventId}`);
    return this.revenueSharingService.distributeRevenue(eventId, totalRevenue);
  }

  @Get('events/:eventId/breakdown')
  @ApiOperation({ summary: 'Get revenue breakdown for dashboard' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Revenue breakdown retrieved successfully' })
  async getRevenueBreakdown(
    @Param('eventId') eventId: string,
  ): Promise<RevenueBreakdown> {
    return this.revenueSharingService.getRevenueBreakdown(eventId);
  }
}