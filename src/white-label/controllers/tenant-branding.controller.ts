import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { TenantBrandingService } from '../services/tenant-branding.service';
import { CreateBrandingDto } from '../dto/create-branding.dto';
import { TenantBranding, BrandingType } from '../entities/tenant-branding.entity';

@ApiTags('White Label - Branding')
@ApiBearerAuth()
@Controller('white-label/tenants/:tenantId/branding')
export class TenantBrandingController {
  constructor(private readonly brandingService: TenantBrandingService) {}

  @Post()
  @ApiOperation({ summary: 'Create tenant branding item' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Branding created successfully', type: TenantBranding })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createBrandingDto: CreateBrandingDto,
  ): Promise<TenantBranding> {
    return this.brandingService.create(tenantId, createBrandingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all branding for tenant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Branding items retrieved', type: [TenantBranding] })
  async findAll(@Param('tenantId') tenantId: string): Promise<TenantBranding[]> {
    return this.brandingService.findByTenant(tenantId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get branding by type' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Branding items retrieved', type: [TenantBranding] })
  async findByType(
    @Param('tenantId') tenantId: string,
    @Param('type') type: BrandingType,
  ): Promise<TenantBranding[]> {
    return this.brandingService.findByTenantAndType(tenantId, type);
  }

  @Get('theme')
  @ApiOperation({ summary: 'Get compiled theme configuration' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Theme configuration retrieved' })
  async getTheme(@Param('tenantId') tenantId: string): Promise<Record<string, any>> {
    return this.brandingService.getThemeConfig(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branding item by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Branding item found', type: TenantBranding })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Branding item not found' })
  async findOne(@Param('id') id: string): Promise<TenantBranding> {
    return this.brandingService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update branding item' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Branding updated successfully', type: TenantBranding })
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateBrandingDto>,
  ): Promise<TenantBranding> {
    return this.brandingService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete branding item' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Branding deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.brandingService.delete(id);
  }

  @Post('upload/:type')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload branding asset' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Asset uploaded successfully', type: TenantBranding })
  async uploadAsset(
    @Param('tenantId') tenantId: string,
    @Param('type') type: BrandingType,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<TenantBranding> {
    return this.brandingService.uploadAsset(tenantId, type, file);
  }
}
