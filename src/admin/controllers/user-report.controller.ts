import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserReportService } from '../services/user-report.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserReportFilterDto } from '../dtos/user-report-filter.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/user/reports')
export class UserReportController {
  constructor(private readonly userReportService: UserReportService) {}

  @Get()
  @ApiOperation({ summary: 'Generate user system reports' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'] })
  generate(@Query() filter: UserReportFilterDto) {
    return this.userReportService.generateReport(filter);
  }
} 