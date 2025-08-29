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
import { TenantDomainService } from '../services/tenant-domain.service';
import { CreateDomainDto } from '../dto/create-domain.dto';
import { TenantDomain } from '../entities/tenant-domain.entity';

@ApiTags('White Label - Domains')
@ApiBearerAuth()
@Controller('white-label/tenants/:tenantId/domains')
export class TenantDomainController {
  constructor(private readonly domainService: TenantDomainService) {}

  @Post()
  @ApiOperation({ summary: 'Create tenant domain' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Domain created successfully', type: TenantDomain })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createDomainDto: CreateDomainDto,
  ): Promise<TenantDomain> {
    return this.domainService.create(tenantId, createDomainDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all domains for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Domains retrieved', type: [TenantDomain] })
  async findAll(@Param('tenantId') tenantId: string): Promise<TenantDomain[]> {
    return this.domainService.findByTenant(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get domain by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Domain found', type: TenantDomain })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Domain not found' })
  async findOne(@Param('id') id: string): Promise<TenantDomain> {
    return this.domainService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update domain' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Domain updated successfully', type: TenantDomain })
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateDomainDto>,
  ): Promise<TenantDomain> {
    return this.domainService.update(id, updateData);
  }

  @Post(':id/set-primary')
  @ApiOperation({ summary: 'Set domain as primary' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Domain set as primary', type: TenantDomain })
  async setPrimary(@Param('id') id: string): Promise<TenantDomain> {
    return this.domainService.setPrimary(id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify domain ownership' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Domain verification attempted', type: TenantDomain })
  async verify(@Param('id') id: string): Promise<TenantDomain> {
    return this.domainService.verify(id);
  }

  @Post(':id/ssl')
  @ApiOperation({ summary: 'Setup SSL for domain' })
  @ApiResponse({ status: HttpStatus.OK, description: 'SSL setup completed', type: TenantDomain })
  async setupSsl(
    @Param('id') id: string,
    @Body('certificate') certificate?: string,
  ): Promise<TenantDomain> {
    return this.domainService.setupSsl(id, certificate);
  }

  @Get('ssl/expiring')
  @ApiOperation({ summary: 'Get domains with expiring SSL certificates' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Expiring SSL domains retrieved', type: [TenantDomain] })
  async getExpiringSsl(): Promise<TenantDomain[]> {
    return this.domainService.checkSslExpiration();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete domain' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Domain deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.domainService.delete(id);
  }
}
