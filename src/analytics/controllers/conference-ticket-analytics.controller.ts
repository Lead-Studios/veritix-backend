import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ConferenceTicketAnalyticsService } from '../services/conference-ticket-analytics.service';
import { 
  ConferenceTicketAnalyticsFilterDto,
  ConferenceTicketExportDto,
  TimeFilter,
  ExportFormat,
  ConferenceTicketAnalyticsResponseDto,
  ConferenceTicketTotalResponseDto,
} from '../dto/conference-ticket-analytics.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Conference Ticket Analytics')
@Controller('analytics/conferences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConferenceTicketAnalyticsController {
  constructor(
    private readonly conferenceTicketAnalyticsService: ConferenceTicketAnalyticsService,
  ) {}

  @Get(':conferenceId/tickets')
  @Roles('admin', 'organizer')
  @ApiOperation({ 
    summary: 'Get total tickets for a conference',
    description: 'Retrieve the total number of tickets ordered for a specific conference'
  })
  @ApiParam({ 
    name: 'conferenceId', 
    description: 'Conference ID',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Total tickets retrieved successfully',
    type: ConferenceTicketTotalResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Conference not found'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Access denied - insufficient permissions'
  })
  async getTotalTickets(
    @Param('conferenceId') conferenceId: string,
    @Request() req,
  ): Promise<ConferenceTicketTotalResponseDto> {
    // Check if user has access to this conference
    await this.checkConferenceAccess(conferenceId, req.user);
    
    return this.conferenceTicketAnalyticsService.getTotalTickets(conferenceId);
  }

  @Get(':conferenceId/tickets/analytics')
  @Roles('admin', 'organizer')
  @ApiOperation({ 
    summary: 'Get filtered ticket analytics for a conference',
    description: 'Retrieve time-filtered ticket analytics data for a specific conference'
  })
  @ApiParam({ 
    name: 'conferenceId', 
    description: 'Conference ID',
    type: 'string'
  })
  @ApiQuery({ 
    name: 'filter', 
    enum: TimeFilter,
    required: false,
    description: 'Time interval filter (hourly, daily, weekly, monthly, yearly)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Analytics data retrieved successfully',
    type: ConferenceTicketAnalyticsResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Conference not found'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Access denied - insufficient permissions'
  })
  async getTicketAnalytics(
    @Param('conferenceId') conferenceId: string,
    @Query('filter') filter?: TimeFilter,
    @Request() req?: any,
  ): Promise<ConferenceTicketAnalyticsResponseDto> {
    // Check if user has access to this conference
    await this.checkConferenceAccess(conferenceId, req.user);
    
    return this.conferenceTicketAnalyticsService.getTicketAnalytics(conferenceId, filter);
  }

  @Get(':conferenceId/tickets/export')
  @Roles('admin', 'organizer')
  @ApiOperation({ 
    summary: 'Export ticket analytics data',
    description: 'Export ticket analytics data in XLS or CSV format'
  })
  @ApiParam({ 
    name: 'conferenceId', 
    description: 'Conference ID',
    type: 'string'
  })
  @ApiQuery({ 
    name: 'format', 
    enum: ExportFormat,
    required: true,
    description: 'Export format (xls or csv)'
  })
  @ApiQuery({ 
    name: 'filter', 
    enum: TimeFilter,
    required: false,
    description: 'Time interval filter (hourly, daily, weekly, monthly, yearly)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'File exported successfully'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid export format'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Conference not found'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Access denied - insufficient permissions'
  })
  async exportTicketAnalytics(
    @Param('conferenceId') conferenceId: string,
    @Query('format', new ParseEnumPipe(ExportFormat)) format: ExportFormat,
    @Query('filter') filter?: TimeFilter,
    @Res() res: Response,
    @Request() req?: any,
  ): Promise<void> {
    // Check if user has access to this conference
    await this.checkConferenceAccess(conferenceId, req.user);
    
    await this.conferenceTicketAnalyticsService.exportTicketAnalytics(
      conferenceId,
      format,
      res,
      filter,
    );
  }

  /**
   * Check if user has access to the conference
   * This is a placeholder - implement based on your authorization logic
   */
  private async checkConferenceAccess(conferenceId: string, user: any): Promise<void> {
    // TODO: Implement proper conference access control
    // This should check if the user is an admin or the conference organizer
    // For now, we'll allow access for admin and organizer roles
    
    if (!user.roles.includes('admin') && !user.roles.includes('organizer')) {
      throw new BadRequestException('Insufficient permissions to access conference analytics');
    }
    
    // Additional checks can be added here:
    // - Check if user is the conference organizer
    // - Check if user has been granted access to this specific conference
    // - Check conference-specific permissions
  }
} 