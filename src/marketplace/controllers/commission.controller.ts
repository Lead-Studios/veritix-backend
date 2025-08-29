import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommissionService } from '../services/commission.service';
import { CommissionStatus } from '../entities/commission.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('Commissions')
@Controller('commissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get vendor commissions' })
  @ApiResponse({ status: 200, description: 'Commissions retrieved successfully' })
  async getVendorCommissions(
    @Param('vendorId') vendorId: string,
    @Query('status') status?: CommissionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const filters: any = { page, limit };
    
    if (status) filters.status = status;
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    return this.commissionService.getVendorCommissions(vendorId, filters);
  }

  @Get('my-commissions')
  @ApiOperation({ summary: 'Get current vendor commissions' })
  @ApiResponse({ status: 200, description: 'Commissions retrieved successfully' })
  async getMyCommissions(
    @GetUser('vendorId') vendorId: string,
    @Query('status') status?: CommissionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const filters: any = { page, limit };
    
    if (status) filters.status = status;
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    return this.commissionService.getVendorCommissions(vendorId, filters);
  }

  @Get('platform/summary')
  @UseGuards(RolesGuard)
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Get platform commission summary (Admin only)' })
  @ApiResponse({ status: 200, description: 'Platform summary retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getPlatformSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.commissionService.getPlatformCommissionSummary(dateRange);
  }

  @Get('overdue')
  @UseGuards(RolesGuard)
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Get overdue commissions (Admin only)' })
  @ApiResponse({ status: 200, description: 'Overdue commissions retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getOverdueCommissions() {
    return this.commissionService.getOverdueCommissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get commission by ID' })
  @ApiResponse({ status: 200, description: 'Commission retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Commission not found' })
  async findOne(@Param('id') id: string) {
    return this.commissionService.findCommissionById(id);
  }

  @Post(':id/calculate')
  @UseGuards(RolesGuard)
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Calculate commission (Admin only)' })
  @ApiResponse({ status: 200, description: 'Commission calculated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async calculate(@Param('id') id: string) {
    return this.commissionService.calculateCommission(id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Approve commission (Admin only)' })
  @ApiResponse({ status: 200, description: 'Commission approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string) {
    return this.commissionService.approveCommission(id);
  }

  @Post(':id/process-payment')
  @UseGuards(RolesGuard)
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Process commission payment (Admin only)' })
  @ApiResponse({ status: 200, description: 'Commission payment processed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async processPayment(@Param('id') id: string) {
    return this.commissionService.processCommissionPayment(id);
  }

  @Post('bulk-approve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Bulk approve commissions (Admin only)' })
  @ApiResponse({ status: 200, description: 'Commissions approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async bulkApprove(@Body('commissionIds') commissionIds: string[]) {
    return this.commissionService.bulkApproveCommissions(commissionIds);
  }

  @Post('distributions/:distributionId/retry')
  @UseGuards(RolesGuard)
  @Roles('admin', 'finance')
  @ApiOperation({ summary: 'Retry failed payment distribution (Admin only)' })
  @ApiResponse({ status: 200, description: 'Distribution retry initiated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async retryDistribution(@Param('distributionId') distributionId: string) {
    return this.commissionService.retryFailedDistribution(distributionId);
  }
}
