import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantIntegrationService, CreateIntegrationDto } from '../services/tenant-integration.service';
import { TenantIntegration, IntegrationType } from '../entities/tenant-integration.entity';

@ApiTags('White Label - Integrations')
@ApiBearerAuth()
@Controller('white-label/tenants/:tenantId/integrations')
export class TenantIntegrationController {
  constructor(private readonly integrationService: TenantIntegrationService) {}

  @Post()
  @ApiOperation({ summary: 'Create tenant integration' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Integration created successfully', type: TenantIntegration })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createIntegrationDto: CreateIntegrationDto,
  ): Promise<TenantIntegration> {
    return this.integrationService.create(tenantId, createIntegrationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all integrations for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Integrations retrieved', type: [TenantIntegration] })
  async findAll(@Param('tenantId') tenantId: string): Promise<TenantIntegration[]> {
    return this.integrationService.findByTenant(tenantId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get integrations by type' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Integrations retrieved', type: [TenantIntegration] })
  async findByType(
    @Param('tenantId') tenantId: string,
    @Param('type') type: IntegrationType,
  ): Promise<TenantIntegration[]> {
    return this.integrationService.findByType(tenantId, type);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get integration metrics for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Integration metrics retrieved' })
  async getMetrics(@Param('tenantId') tenantId: string): Promise<any> {
    return this.integrationService.getIntegrationMetrics(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Integration found', type: TenantIntegration })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Integration not found' })
  async findOne(@Param('id') id: string): Promise<TenantIntegration> {
    return this.integrationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update integration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Integration updated successfully', type: TenantIntegration })
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateIntegrationDto>,
  ): Promise<TenantIntegration> {
    return this.integrationService.update(id, updateData);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test integration connection' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Integration test result' })
  async test(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.integrationService.testIntegration(id);
  }

  @Post('webhook/:event')
  @ApiOperation({ summary: 'Execute webhook for event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook executed' })
  async executeWebhook(
    @Param('tenantId') tenantId: string,
    @Param('event') event: string,
    @Body() payload: any,
  ): Promise<void> {
    return this.integrationService.executeWebhook(tenantId, event, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete integration' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Integration deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.integrationService.delete(id);
  }
}

@ApiTags('White Label - Integration Management')
@ApiBearerAuth()
@Controller('white-label/integrations')
export class IntegrationManagementController {
  constructor(private readonly integrationService: TenantIntegrationService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get global integration metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Global integration metrics retrieved' })
  async getGlobalMetrics(): Promise<any> {
    return this.integrationService.getIntegrationMetrics();
  }
}
