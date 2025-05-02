import {
    Controller,
    Get,
    Param,
    Query,
    Res,
    UseGuards,
    ParseIntPipe,
  } from '@nestjs/common';
  import { AnalyticsService } from './analytics.service';
  import { Response } from 'express';
  import { JwtStrategy } from '../auth/providers/jwt.strategy';
  import { RolesGuard } from '../auth/roles.guard';
  import { Roles } from '../auth/roles.decorator';
  import { UserRole } from '../common/enums/users-roles.enum';
  import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiParam,
    ApiQuery,
  } from '@nestjs/swagger';
  
  @ApiTags('analytics')
  @ApiBearerAuth()
  @Controller('analytics/conferences')
  @UseGuards(JwtStrategy, RolesGuard)
  export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}
  
    @Get(':conferenceId/tickets')
    @Roles(UserRole.Admin, UserRole.Organizer)
    @ApiOperation({ summary: 'Get ticket analytics for a conference' })
    @ApiParam({ name: 'conferenceId', type: Number })
    @ApiQuery({ name: 'filter', required: false, enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'] })
    async getTicketAnalytics(
      @Param('conferenceId', ParseIntPipe) conferenceId: number,
      @Query('filter') filter?: string,
    ) {
      if (!filter) {
        return { total: await this.analyticsService.getTotalTickets(conferenceId) };
      }
      return this.analyticsService.getFilteredTickets(conferenceId, filter);
    }
  
    @Get(':conferenceId/tickets/export')
    @Roles(UserRole.Admin, UserRole.Organizer)
    @ApiOperation({ summary: 'Export ticket analytics' })
    @ApiParam({ name: 'conferenceId', type: Number })
    @ApiQuery({ name: 'format', required: true, enum: ['xls', 'csv'] })
    @ApiQuery({ name: 'filter', required: true, enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'] })
    async exportTicketAnalytics(
      @Param('conferenceId', ParseIntPipe) conferenceId: number,
      @Query('format') format: 'xls' | 'csv',
      @Query('filter') filter: string,
      @Res() res: Response,
    ) {
      await this.analyticsService.exportTickets(conferenceId, format, filter, res);
    }
  }