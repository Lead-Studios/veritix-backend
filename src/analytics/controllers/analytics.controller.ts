import { Controller, Get, Query, Res, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { ExportService } from '../services/export.service';
import { AnalyticsFilterDto } from '../dto/analytics-filter.dto';
import { DashboardResponseDto } from '../dto/dashboard-response.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly exportService: ExportService,
  ) {}

  @Get('dashboard/:organizerId')
  async getDashboard(
    organizerId: string,
    @Query(ValidationPipe) filters: AnalyticsFilterDto,
    @Res() res?: Response,
  ): Promise<DashboardResponseDto | void> {
    const data = await this.analyticsService.getDashboardData(
      organizerId,
      filters,
    );

    if (filters.exportToCsv && res) {
      return this.exportService.exportToCsv(data, res);
    }

    if (filters.exportToPdf && res) {
      return this.exportService.exportToPdf(data, res);
    }

    if (res) {
      res.json(data);
      return;
    }

    return data;
  }

  @Get('conferences/:organizerId')
  async getConferences(organizerId: string) {
    return this.analyticsService.getConferencesByOrganizer(organizerId);
  }

  @Get('tracks/:conferenceId')
  async getTracks(conferenceId: string) {
    return this.analyticsService.getTracksByConference(conferenceId);
  }

  @Get('speakers/:conferenceId')
  async getSpeakers(conferenceId: string) {
    return this.analyticsService.getSpeakersByConference(conferenceId);
  }
}
