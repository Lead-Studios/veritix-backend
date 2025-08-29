import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { Tenant } from '../entities/tenant.entity';

@ApiTags('White Label - Tenants')
@ApiBearerAuth()
@Controller('white-label/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tenant created successfully', type: Tenant })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Tenant with slug already exists' })
  async create(@Body() createTenantDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'tier', required: false, description: 'Filter by tier' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenants retrieved successfully' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('tier') tier?: string,
  ): Promise<{ tenants: Tenant[]; total: number }> {
    const filters = { status, tier };
    return this.tenantService.findAll(+page, +limit, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenant found', type: Tenant })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async findOne(@Param('id') id: string): Promise<Tenant> {
    return this.tenantService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get tenant by slug' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenant found', type: Tenant })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async findBySlug(@Param('slug') slug: string): Promise<Tenant> {
    return this.tenantService.findBySlug(slug);
  }

  @Get('domain/:domain')
  @ApiOperation({ summary: 'Get tenant by domain' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenant found', type: Tenant })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async findByDomain(@Param('domain') domain: string): Promise<Tenant> {
    return this.tenantService.findByDomain(domain);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenant updated successfully', type: Tenant })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenant suspended successfully', type: Tenant })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async suspend(@Param('id') id: string, @Body('reason') reason: string): Promise<Tenant> {
    return this.tenantService.suspend(id, reason);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenant activated successfully', type: Tenant })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async activate(@Param('id') id: string): Promise<Tenant> {
    return this.tenantService.activate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenant (soft delete)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tenantService.delete(id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get tenant usage statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Usage statistics retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async getUsageStats(@Param('id') id: string): Promise<any> {
    return this.tenantService.getUsageStats(id);
  }

  @Post(':id/check-limits')
  @ApiOperation({ summary: 'Check tenant resource limits' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Limit check result' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tenant not found' })
  async checkLimits(
    @Param('id') id: string,
    @Body('resource') resource: string,
    @Body('increment') increment = 1,
  ): Promise<{ allowed: boolean }> {
    const allowed = await this.tenantService.checkLimits(id, resource, increment);
    return { allowed };
  }
}
