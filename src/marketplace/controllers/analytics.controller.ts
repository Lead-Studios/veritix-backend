import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('vendor/:vendorId/dashboard')
  @ApiOperation({ summary: 'Get vendor analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Vendor dashboard retrieved successfully' })
  async getVendorDashboard(
    @Param('vendorId') vendorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getVendorDashboard(vendorId, dateRange);
  }

  @Get('my-dashboard')
  @ApiOperation({ summary: 'Get current vendor analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Vendor dashboard retrieved successfully' })
  async getMyDashboard(
    @GetUser('vendorId') vendorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getVendorDashboard(vendorId, dateRange);
  }

  @Get('marketplace/dashboard')
  @UseGuards(RolesGuard)
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Get marketplace analytics dashboard (Admin only)' })
  @ApiResponse({ status: 200, description: 'Marketplace dashboard retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMarketplaceDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getMarketplaceDashboard(dateRange);
  }
}
