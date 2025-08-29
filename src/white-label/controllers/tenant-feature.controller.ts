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
import { TenantFeatureService } from '../services/tenant-feature.service';
import { CreateFeatureDto } from '../dto/create-feature.dto';
import { TenantFeature, FeatureCategory } from '../entities/tenant-feature.entity';

@ApiTags('White Label - Features')
@ApiBearerAuth()
@Controller('white-label/tenants/:tenantId/features')
export class TenantFeatureController {
  constructor(private readonly featureService: TenantFeatureService) {}

  @Post()
  @ApiOperation({ summary: 'Create tenant feature' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Feature created successfully', type: TenantFeature })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createFeatureDto: CreateFeatureDto,
  ): Promise<TenantFeature> {
    return this.featureService.create(tenantId, createFeatureDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all features for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Features retrieved', type: [TenantFeature] })
  async findAll(@Param('tenantId') tenantId: string): Promise<TenantFeature[]> {
    return this.featureService.findByTenant(tenantId);
  }

  @Get('enabled')
  @ApiOperation({ summary: 'Get enabled features for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Enabled features retrieved', type: [TenantFeature] })
  async findEnabled(@Param('tenantId') tenantId: string): Promise<TenantFeature[]> {
    return this.featureService.findEnabledByTenant(tenantId);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get features by category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Features retrieved', type: [TenantFeature] })
  async findByCategory(
    @Param('tenantId') tenantId: string,
    @Param('category') category: FeatureCategory,
  ): Promise<TenantFeature[]> {
    return this.featureService.findByCategory(tenantId, category);
  }

  @Get(':featureKey')
  @ApiOperation({ summary: 'Get feature by key' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature found', type: TenantFeature })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Feature not found' })
  async findByKey(
    @Param('tenantId') tenantId: string,
    @Param('featureKey') featureKey: string,
  ): Promise<TenantFeature> {
    return this.featureService.findByKey(tenantId, featureKey);
  }

  @Get(':featureKey/enabled')
  @ApiOperation({ summary: 'Check if feature is enabled' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature status checked' })
  async isEnabled(
    @Param('tenantId') tenantId: string,
    @Param('featureKey') featureKey: string,
  ): Promise<{ enabled: boolean }> {
    const enabled = await this.featureService.isFeatureEnabled(tenantId, featureKey);
    return { enabled };
  }

  @Get(':featureKey/config')
  @ApiOperation({ summary: 'Get feature configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature config retrieved' })
  async getConfig(
    @Param('tenantId') tenantId: string,
    @Param('featureKey') featureKey: string,
  ): Promise<Record<string, any> | null> {
    return this.featureService.getFeatureConfig(tenantId, featureKey);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update feature' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature updated successfully', type: TenantFeature })
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateFeatureDto>,
  ): Promise<TenantFeature> {
    return this.featureService.update(id, updateData);
  }

  @Post(':featureKey/enable')
  @ApiOperation({ summary: 'Enable feature' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature enabled successfully', type: TenantFeature })
  async enable(
    @Param('tenantId') tenantId: string,
    @Param('featureKey') featureKey: string,
    @Body('enabledBy') enabledBy?: string,
  ): Promise<TenantFeature> {
    return this.featureService.enable(tenantId, featureKey, enabledBy);
  }

  @Post(':featureKey/disable')
  @ApiOperation({ summary: 'Disable feature' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feature disabled successfully', type: TenantFeature })
  async disable(
    @Param('tenantId') tenantId: string,
    @Param('featureKey') featureKey: string,
  ): Promise<TenantFeature> {
    return this.featureService.disable(tenantId, featureKey);
  }

  @Post('bulk/enable')
  @ApiOperation({ summary: 'Enable multiple features' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Features enabled successfully', type: [TenantFeature] })
  async bulkEnable(
    @Param('tenantId') tenantId: string,
    @Body('featureKeys') featureKeys: string[],
    @Body('enabledBy') enabledBy?: string,
  ): Promise<TenantFeature[]> {
    return this.featureService.bulkEnable(tenantId, featureKeys, enabledBy);
  }

  @Post('bulk/disable')
  @ApiOperation({ summary: 'Disable multiple features' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Features disabled successfully', type: [TenantFeature] })
  async bulkDisable(
    @Param('tenantId') tenantId: string,
    @Body('featureKeys') featureKeys: string[],
  ): Promise<TenantFeature[]> {
    return this.featureService.bulkDisable(tenantId, featureKeys);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete feature' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Feature deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.featureService.delete(id);
  }
}
