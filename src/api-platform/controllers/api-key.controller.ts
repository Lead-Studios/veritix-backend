import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApiKeyService, CreateApiKeyDto, ApiKeyResponse } from '../services/api-key.service';
import { ApiKey, ApiPermission } from '../entities/api-key.entity';
import { RequireApiPermissions, ApiAdmin } from '../decorators/api-decorators';

@ApiTags('API Platform - API Keys')
@ApiBearerAuth()
@Controller('api/v1/keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiAdmin()
  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'API key created successfully' })
  async create(@Body() createApiKeyDto: CreateApiKeyDto): Promise<ApiKeyResponse> {
    return this.apiKeyService.create(createApiKeyDto);
  }

  @Get()
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'API keys retrieved successfully' })
  async findAll(
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
  ): Promise<Omit<ApiKeyResponse, 'key'>[]> {
    return this.apiKeyService.findAll(tenantId, userId);
  }

  @Get(':id')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'API key found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  async findOne(@Param('id') id: string): Promise<ApiKey> {
    return this.apiKeyService.findOne(id);
  }

  @Patch(':id')
  @RequireApiPermissions(ApiPermission.WRITE)
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: HttpStatus.OK, description: 'API key updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateApiKeyDto>,
  ): Promise<ApiKey> {
    return this.apiKeyService.update(id, updateDto);
  }

  @Post(':id/revoke')
  @RequireApiPermissions(ApiPermission.WRITE)
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: HttpStatus.OK, description: 'API key revoked successfully' })
  async revoke(@Param('id') id: string): Promise<ApiKey> {
    return this.apiKeyService.revoke(id);
  }

  @Post(':id/activate')
  @RequireApiPermissions(ApiPermission.WRITE)
  @ApiOperation({ summary: 'Activate API key' })
  @ApiResponse({ status: HttpStatus.OK, description: 'API key activated successfully' })
  async activate(@Param('id') id: string): Promise<ApiKey> {
    return this.apiKeyService.activate(id);
  }

  @Post(':id/deactivate')
  @RequireApiPermissions(ApiPermission.WRITE)
  @ApiOperation({ summary: 'Deactivate API key' })
  @ApiResponse({ status: HttpStatus.OK, description: 'API key deactivated successfully' })
  async deactivate(@Param('id') id: string): Promise<ApiKey> {
    return this.apiKeyService.deactivate(id);
  }

  @Post(':id/regenerate')
  @RequireApiPermissions(ApiPermission.WRITE)
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiResponse({ status: HttpStatus.OK, description: 'API key regenerated successfully' })
  async regenerate(@Param('id') id: string): Promise<ApiKeyResponse> {
    return this.apiKeyService.regenerate(id);
  }

  @Get(':id/usage')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get API key usage statistics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze', example: 30 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Usage statistics retrieved' })
  async getUsageStats(
    @Param('id') id: string,
    @Query('days') days?: number,
  ): Promise<any> {
    return this.apiKeyService.getUsageStats(id, days ? parseInt(days.toString()) : 30);
  }

  @Delete(':id')
  @ApiAdmin()
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'API key deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.apiKeyService.delete(id);
  }
}
