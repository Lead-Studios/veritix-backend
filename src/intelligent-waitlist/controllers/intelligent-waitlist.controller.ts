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
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { IntelligentWaitlistService } from '../services/intelligent-waitlist.service';
import { QueueManagementService } from '../services/queue-management.service';
import { VipPriorityService } from '../services/vip-priority.service';
import { BulkManagementService } from '../services/bulk-management.service';
import { WaitlistAnalyticsService } from '../services/waitlist-analytics.service';
import { NotificationCampaignService } from '../services/notification-campaign.service';
import { WaitlistPriority, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { NotificationChannel } from '../entities/waitlist-notification-preference.entity';
import {
  JoinWaitlistDto,
  UpdateWaitlistEntryDto,
  SetNotificationPreferencesDto,
  BulkOperationDto,
  BulkUpdateDto,
  BulkImportDto,
  CreateCampaignDto,
  VipUpgradeDto,
  TicketReleaseResponseDto,
} from '../dto/waitlist.dto';

@ApiTags('Intelligent Waitlist')
@Controller('intelligent-waitlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntelligentWaitlistController {
  constructor(
    private readonly waitlistService: IntelligentWaitlistService,
    private readonly queueService: QueueManagementService,
    private readonly vipService: VipPriorityService,
    private readonly bulkService: BulkManagementService,
    private readonly analyticsService: WaitlistAnalyticsService,
    private readonly campaignService: NotificationCampaignService,
  ) {}

  // Basic Waitlist Operations

  @Post('join')
  @ApiOperation({ summary: 'Join event waitlist' })
  @ApiResponse({ status: 201, description: 'Successfully joined waitlist' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Already on waitlist' })
  async joinWaitlist(
    @GetUser('id') userId: string,
    @Body() joinDto: JoinWaitlistDto,
  ) {
    const entry = await this.waitlistService.joinWaitlist(userId, joinDto);
    return {
      success: true,
      data: entry,
      message: 'Successfully joined waitlist',
    };
  }

  @Delete(':eventId/leave')
  @ApiOperation({ summary: 'Leave event waitlist' })
  @ApiResponse({ status: 200, description: 'Successfully left waitlist' })
  @ApiResponse({ status: 404, description: 'Waitlist entry not found' })
  async leaveWaitlist(
    @GetUser('id') userId: string,
    @Param('eventId') eventId: string,
  ) {
    await this.waitlistService.removeFromWaitlist(userId, eventId);
    return {
      success: true,
      message: 'Successfully left waitlist',
    };
  }

  @Get(':eventId/position')
  @ApiOperation({ summary: 'Get user position in waitlist' })
  @ApiResponse({ status: 200, description: 'Position retrieved successfully' })
  async getPosition(
    @GetUser('id') userId: string,
    @Param('eventId') eventId: string,
  ) {
    const position = await this.waitlistService.getUserPosition(userId, eventId);
    return {
      success: true,
      data: position,
    };
  }

  @Put(':eventId')
  @ApiOperation({ summary: 'Update waitlist entry' })
  @ApiResponse({ status: 200, description: 'Entry updated successfully' })
  async updateEntry(
    @GetUser('id') userId: string,
    @Param('eventId') eventId: string,
    @Body() updateDto: UpdateWaitlistEntryDto,
  ) {
    const entry = await this.waitlistService.updateWaitlistEntry(userId, eventId, updateDto);
    return {
      success: true,
      data: entry,
      message: 'Waitlist entry updated successfully',
    };
  }

  @Get('my-entries')
  @ApiOperation({ summary: 'Get user\'s waitlist entries' })
  @ApiResponse({ status: 200, description: 'Entries retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, enum: WaitlistStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getMyEntries(
    @GetUser('id') userId: string,
    @Query('status') status?: WaitlistStatus,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ) {
    const entries = await this.waitlistService.getUserWaitlistEntries(
      userId,
      { status },
      { limit, offset }
    );
    return {
      success: true,
      data: entries,
    };
  }

  // Notification Preferences

  @Post(':eventId/notification-preferences')
  @ApiOperation({ summary: 'Set notification preferences' })
  @ApiResponse({ status: 201, description: 'Preferences set successfully' })
  async setNotificationPreferences(
    @GetUser('id') userId: string,
    @Param('eventId') eventId: string,
    @Body() preferencesDto: SetNotificationPreferencesDto,
  ) {
    const preferences = await this.waitlistService.setNotificationPreferences(
      userId,
      eventId,
      preferencesDto.preferences
    );
    return {
      success: true,
      data: preferences,
      message: 'Notification preferences updated',
    };
  }

  @Get(':eventId/notification-preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getNotificationPreferences(
    @GetUser('id') userId: string,
    @Param('eventId') eventId: string,
  ) {
    const preferences = await this.waitlistService.getNotificationPreferences(userId, eventId);
    return {
      success: true,
      data: preferences,
    };
  }

  // Ticket Release Management

  @Post('releases/:releaseId/respond')
  @ApiOperation({ summary: 'Respond to ticket release offer' })
  @ApiResponse({ status: 200, description: 'Response recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid response or expired offer' })
  async respondToTicketRelease(
    @GetUser('id') userId: string,
    @Param('releaseId') releaseId: string,
    @Body() responseDto: TicketReleaseResponseDto,
  ) {
    const result = await this.queueService.handleReleaseResponse(releaseId, responseDto.response);
    return {
      success: true,
      data: result,
      message: `Ticket offer ${responseDto.response}ed successfully`,
    };
  }

  @Get('releases/my-offers')
  @ApiOperation({ summary: 'Get user\'s active ticket offers' })
  @ApiResponse({ status: 200, description: 'Offers retrieved successfully' })
  async getMyOffers(@GetUser('id') userId: string) {
    const offers = await this.waitlistService.getUserActiveOffers(userId);
    return {
      success: true,
      data: offers,
    };
  }

  // VIP and Priority Management

  @Post(':eventId/upgrade-vip')
  @ApiOperation({ summary: 'Upgrade to VIP status' })
  @ApiResponse({ status: 200, description: 'VIP upgrade successful' })
  @ApiResponse({ status: 400, description: 'Not eligible for VIP upgrade' })
  async upgradeToVip(
    @GetUser('id') userId: string,
    @Param('eventId') eventId: string,
    @Body() upgradeDto: VipUpgradeDto,
  ) {
    const result = await this.vipService.upgradeToVip(
      userId,
      eventId,
      upgradeDto.tier,
      upgradeDto.reason
    );
    return {
      success: true,
      data: result,
      message: 'VIP upgrade successful',
    };
  }

  @Get(':eventId/vip-analytics')
  @ApiOperation({ summary: 'Get VIP analytics for event' })
  @ApiResponse({ status: 200, description: 'VIP analytics retrieved' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async getVipAnalytics(@Param('eventId') eventId: string) {
    const analytics = await this.vipService.getVipAnalytics(eventId);
    return {
      success: true,
      data: analytics,
    };
  }

  // Analytics and Reporting

  @Get(':eventId/analytics')
  @ApiOperation({ summary: 'Get comprehensive waitlist analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['hourly', 'daily', 'weekly', 'monthly'] })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async getAnalytics(
    @Param('eventId') eventId: string,
    @Query('period') period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    const analytics = await this.analyticsService.getEventAnalytics(eventId, period as any);
    return {
      success: true,
      data: analytics,
    };
  }

  @Get(':eventId/analytics/report')
  @ApiOperation({ summary: 'Generate analytics report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async generateReport(@Param('eventId') eventId: string) {
    const report = await this.analyticsService.generateAnalyticsReport(eventId);
    return {
      success: true,
      data: report,
    };
  }

  @Get(':eventId/queue-metrics')
  @ApiOperation({ summary: 'Get real-time queue metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async getQueueMetrics(@Param('eventId') eventId: string) {
    const metrics = await this.queueService.getQueueMetrics(eventId);
    return {
      success: true,
      data: metrics,
    };
  }

  // Bulk Operations

  @Post('bulk/update')
  @ApiOperation({ summary: 'Bulk update waitlist entries' })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async bulkUpdate(@Body() bulkUpdateDto: BulkUpdateDto) {
    const result = await this.bulkService.bulkUpdate(
      bulkUpdateDto.filter,
      bulkUpdateDto.updateData,
      bulkUpdateDto.options
    );
    return {
      success: result.success,
      data: result,
    };
  }

  @Post('bulk/remove')
  @ApiOperation({ summary: 'Bulk remove users from waitlists' })
  @ApiResponse({ status: 200, description: 'Bulk removal completed' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async bulkRemove(@Body() bulkOperationDto: BulkOperationDto) {
    const result = await this.bulkService.bulkRemove(
      bulkOperationDto.filter,
      bulkOperationDto.reason,
      bulkOperationDto.options
    );
    return {
      success: result.success,
      data: result,
    };
  }

  @Post(':eventId/bulk/import')
  @ApiOperation({ summary: 'Bulk import users to waitlist' })
  @ApiResponse({ status: 200, description: 'Bulk import completed' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async bulkImport(
    @Param('eventId') eventId: string,
    @Body() importDto: BulkImportDto,
  ) {
    const result = await this.bulkService.bulkImport(
      eventId,
      importDto.userData,
      importDto.options
    );
    return {
      success: result.success,
      data: result,
    };
  }

  @Get('bulk/export')
  @ApiOperation({ summary: 'Export waitlist data' })
  @ApiResponse({ status: 200, description: 'Data exported successfully' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json', 'xlsx'] })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async bulkExport(
    @Query() filter: any,
    @Query('format') format: 'csv' | 'json' | 'xlsx' = 'csv',
  ) {
    const result = await this.bulkService.bulkExport(filter, format);
    return {
      success: true,
      data: result,
    };
  }

  @Get('bulk/stats')
  @ApiOperation({ summary: 'Get bulk operation statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async getBulkStats(@Query() filter: any) {
    const stats = await this.bulkService.getBulkOperationStats(filter);
    return {
      success: true,
      data: stats,
    };
  }

  // Campaign Management

  @Post('campaigns')
  @ApiOperation({ summary: 'Create notification campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async createCampaign(@Body() campaignDto: CreateCampaignDto) {
    const result = await this.campaignService.createCampaign(
      campaignDto.template,
      campaignDto.eventId
    );
    return {
      success: true,
      data: result,
      message: 'Campaign created successfully',
    };
  }

  @Get('campaigns/templates')
  @ApiOperation({ summary: 'Get available campaign templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async getCampaignTemplates() {
    const templates = this.campaignService.getCampaignTemplates();
    return {
      success: true,
      data: templates,
    };
  }

  @Post('campaigns/bulk-notify')
  @ApiOperation({ summary: 'Send bulk notifications' })
  @ApiResponse({ status: 200, description: 'Bulk notifications sent' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async sendBulkNotifications(@Body() notificationDto: any) {
    const result = await this.campaignService.sendBulkNotifications(notificationDto);
    return {
      success: result.success,
      data: result,
    };
  }

  // Admin Operations

  @Post(':eventId/process-releases')
  @ApiOperation({ summary: 'Manually trigger ticket release processing' })
  @ApiResponse({ status: 200, description: 'Release processing triggered' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async processTicketReleases(
    @Param('eventId') eventId: string,
    @Body() releaseData: { availableTickets: number; strategy?: any },
  ) {
    const result = await this.queueService.processTicketRelease(
      eventId,
      releaseData.availableTickets,
      releaseData.strategy
    );
    return {
      success: true,
      data: result,
      message: 'Ticket release processing completed',
    };
  }

  @Post(':eventId/recalculate-positions')
  @ApiOperation({ summary: 'Recalculate waitlist positions' })
  @ApiResponse({ status: 200, description: 'Positions recalculated successfully' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async recalculatePositions(@Param('eventId') eventId: string) {
    await this.queueService.recalculatePositions(eventId);
    return {
      success: true,
      message: 'Positions recalculated successfully',
    };
  }

  @Post(':eventId/evaluate-vip-eligibility')
  @ApiOperation({ summary: 'Evaluate and upgrade eligible VIP users' })
  @ApiResponse({ status: 200, description: 'VIP evaluation completed' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async evaluateVipEligibility(@Param('eventId') eventId: string) {
    const result = await this.vipService.evaluateVipEligibility(eventId);
    return {
      success: true,
      data: result,
      message: 'VIP eligibility evaluation completed',
    };
  }

  @Post(':eventId/vip-only-release')
  @ApiOperation({ summary: 'Create VIP-only ticket release' })
  @ApiResponse({ status: 200, description: 'VIP release created successfully' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async createVipOnlyRelease(
    @Param('eventId') eventId: string,
    @Body() releaseData: { ticketQuantity: number; vipTiers?: string[] },
  ) {
    const result = await this.vipService.createVipOnlyRelease(
      eventId,
      releaseData.ticketQuantity,
      releaseData.vipTiers
    );
    return {
      success: true,
      data: result,
      message: 'VIP-only release created successfully',
    };
  }

  @Get(':eventId/optimize-queue')
  @ApiOperation({ summary: 'Get queue optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Optimization recommendations generated' })
  @Roles('organizer', 'admin')
  @UseGuards(RolesGuard)
  async optimizeQueue(@Param('eventId') eventId: string) {
    const result = await this.queueService.optimizeQueue(eventId);
    return {
      success: true,
      data: result,
    };
  }

  // Health and Status

  @Get('health')
  @ApiOperation({ summary: 'Check waitlist system health' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getHealth() {
    // Implementation would check various system components
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          waitlist: 'operational',
          notifications: 'operational',
          analytics: 'operational',
          queue: 'operational',
        },
      },
    };
  }
}
