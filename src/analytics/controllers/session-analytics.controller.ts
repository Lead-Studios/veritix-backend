import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SessionAnalyticsService } from '../services/session-analytics.service';
import { ExportService } from '../services/export.service';
import { SessionAnalyticsFilterDto } from '../dto/session-analytics.dto';
import {
  SessionAnalyticsDashboardDto,
  SessionAnalyticsSummaryDto,
} from '../dto/session-analytics.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../rbac/enums/role.enum';

@ApiTags('Session Analytics')
@Controller('analytics/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionAnalyticsController {
  constructor(
    private readonly sessionAnalyticsService: SessionAnalyticsService,
    private readonly exportService: ExportService,
  ) {}

  @Get('dashboard/:organizerId')
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiOperation({
    summary: 'Get session analytics dashboard',
    description:
      'Retrieve comprehensive session analytics dashboard with attendance, engagement, and performance metrics',
  })
  @ApiParam({
    name: 'organizerId',
    description: 'Organizer ID',
    type: 'string',
  })
  @ApiQuery({
    name: 'timeFilter',
    description: 'Time interval filter',
    enum: ['today', 'week', 'month', 'quarter', 'year'],
    required: false,
  })
  @ApiQuery({
    name: 'conferenceId',
    description: 'Filter by specific conference',
    required: false,
  })
  @ApiQuery({
    name: 'track',
    description: 'Filter by specific track',
    required: false,
  })
  @ApiQuery({
    name: 'speaker',
    description: 'Filter by specific speaker',
    required: false,
  })
  @ApiQuery({
    name: 'date',
    description: 'Filter by specific date (YYYY-MM-DD)',
    required: false,
  })
  @ApiQuery({
    name: 'exportToCsv',
    description: 'Export data to CSV format',
    required: false,
    type: 'boolean',
  })
  @ApiQuery({
    name: 'exportToPdf',
    description: 'Export data to PDF format',
    required: false,
    type: 'boolean',
  })
  @ApiResponse({
    status: 200,
    description: 'Session analytics dashboard data retrieved successfully',
    type: SessionAnalyticsDashboardDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getSessionAnalyticsDashboard(
    @Param('organizerId') organizerId: string,
    @Query(ValidationPipe) filters: SessionAnalyticsFilterDto,
    @Res() res?: Response,
  ): Promise<SessionAnalyticsDashboardDto | void> {
    const data =
      await this.sessionAnalyticsService.getSessionAnalyticsDashboard(
        organizerId,
        filters,
      );

    if (filters.exportToCsv && res) {
      return this.exportService.exportSessionAnalyticsToCsv(data, res);
    }

    if (filters.exportToPdf && res) {
      return this.exportService.exportSessionAnalyticsToPdf(data, res);
    }

    if (res) {
      res.json(data);
      return;
    }

    return data;
  }

  @Get('summary/:organizerId')
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiOperation({
    summary: 'Get session analytics summary',
    description:
      'Retrieve summary statistics for session analytics including key performance indicators',
  })
  @ApiParam({
    name: 'organizerId',
    description: 'Organizer ID',
    type: 'string',
  })
  @ApiQuery({
    name: 'timeFilter',
    description: 'Time interval filter',
    enum: ['today', 'week', 'month', 'quarter', 'year'],
    required: false,
  })
  @ApiQuery({
    name: 'conferenceId',
    description: 'Filter by specific conference',
    required: false,
  })
  @ApiQuery({
    name: 'track',
    description: 'Filter by specific track',
    required: false,
  })
  @ApiQuery({
    name: 'speaker',
    description: 'Filter by specific speaker',
    required: false,
  })
  @ApiQuery({
    name: 'date',
    description: 'Filter by specific date (YYYY-MM-DD)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Session analytics summary retrieved successfully',
    type: SessionAnalyticsSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getSessionAnalyticsSummary(
    @Param('organizerId') organizerId: string,
    @Query(ValidationPipe) filters: SessionAnalyticsFilterDto,
  ): Promise<SessionAnalyticsSummaryDto> {
    return this.sessionAnalyticsService.getSessionAnalyticsSummary(
      organizerId,
      filters,
    );
  }

  @Get('tracks/:conferenceId')
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiOperation({
    summary: 'Get available tracks for a conference',
    description:
      'Retrieve list of available tracks for filtering session analytics',
  })
  @ApiParam({
    name: 'conferenceId',
    description: 'Conference ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Available tracks retrieved successfully',
    type: [String],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getAvailableTracks(
    @Param('conferenceId') conferenceId: string,
  ): Promise<string[]> {
    // This would typically come from the session repository
    // For now, returning a placeholder implementation
    return ['Technology', 'Business', 'Marketing', 'Design', 'Development'];
  }

  @Get('speakers/:conferenceId')
  @Roles(Role.ORGANIZER, Role.ADMIN)
  @ApiOperation({
    summary: 'Get available speakers for a conference',
    description:
      'Retrieve list of available speakers for filtering session analytics',
  })
  @ApiParam({
    name: 'conferenceId',
    description: 'Conference ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Available speakers retrieved successfully',
    type: [String],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getAvailableSpeakers(
    @Param('conferenceId') conferenceId: string,
  ): Promise<string[]> {
    // This would typically come from the session repository
    // For now, returning a placeholder implementation
    return [
      'John Doe',
      'Jane Smith',
      'Bob Johnson',
      'Alice Brown',
      'Charlie Wilson',
    ];
  }
}
