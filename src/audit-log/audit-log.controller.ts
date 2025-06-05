import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  UseGuards, 
  ParseIntPipe, 
  ParseUUIDPipe,
  BadRequestException,
  SetMetadata
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('audit-log')
@Controller('audit-log')
@SetMetadata('roles', ['admin']) // Ensure only admins can access audit logs
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'adminId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('adminId') adminId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Parse dates if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;
    
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    }
    
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    }
    
    return this.auditLogService.findAll(
      page || 1,
      limit || 10,
      type,
      userId,
      adminId,
      parsedStartDate,
      parsedEndDate,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Audit log ID' })
  @ApiResponse({ status: 200, description: 'Returns the audit log' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogService.findOne(id);
  }
}
