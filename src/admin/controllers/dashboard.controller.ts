import { Controller, Get, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch app analytics' })
  getAnalytics() {
    return this.dashboardService.getAnalytics();
  }

  @Get('events/:eventId')
  @ApiOperation({ summary: 'Get event dashboard statistics' })
  getEventDashboard(
    @Param('eventId', new ParseUUIDPipe()) eventId: string
  ) {
    return this.dashboardService.getEventDashboard(eventId);
  }
} 