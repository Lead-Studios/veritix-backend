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
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from '../services/marketplace.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { ServiceSearchDto } from '../dto/service-search.dto';
import { ServiceStatus } from '../entities/service-listing.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('services')
  @ApiOperation({ summary: 'Search and browse services' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async findServices(@Query() searchDto: ServiceSearchDto) {
    return this.marketplaceService.findServices(searchDto);
  }

  @Get('services/featured')
  @ApiOperation({ summary: 'Get featured services' })
  @ApiResponse({ status: 200, description: 'Featured services retrieved successfully' })
  async getFeaturedServices(@Query('limit') limit?: number) {
    return this.marketplaceService.getFeaturedServices(limit);
  }

  @Get('services/popular')
  @ApiOperation({ summary: 'Get popular services' })
  @ApiResponse({ status: 200, description: 'Popular services retrieved successfully' })
  async getPopularServices(@Query('limit') limit?: number) {
    return this.marketplaceService.getPopularServices(limit);
  }

  @Get('services/recommended')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recommended services for user' })
  @ApiResponse({ status: 200, description: 'Recommended services retrieved successfully' })
  async getRecommendedServices(
    @GetUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.marketplaceService.getRecommendedServices(userId, limit);
  }

  @Get('services/category/:categoryId')
  @ApiOperation({ summary: 'Get services by category' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async getServicesByCategory(
    @Param('categoryId') categoryId: string,
    @Query('limit') limit?: number,
  ) {
    return this.marketplaceService.getServicesByCategory(categoryId, limit);
  }

  @Get('services/vendor/:vendorId')
  @ApiOperation({ summary: 'Get services by vendor' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async getServicesByVendor(@Param('vendorId') vendorId: string) {
    return this.marketplaceService.getServicesByVendor(vendorId);
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiResponse({ status: 200, description: 'Service retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findServiceById(@Param('id') id: string) {
    return this.marketplaceService.findServiceById(id);
  }

  @Get('services/slug/:slug')
  @ApiOperation({ summary: 'Get service by slug' })
  @ApiResponse({ status: 200, description: 'Service retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findServiceBySlug(@Param('slug') slug: string) {
    return this.marketplaceService.findServiceBySlug(slug);
  }

  @Post('services')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service listing' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createService(@Body() createServiceDto: CreateServiceDto) {
    return this.marketplaceService.createService(createServiceDto);
  }

  @Patch('services/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service listing' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async updateService(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.marketplaceService.updateService(id, updateServiceDto);
  }

  @Patch('services/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service status (Admin/Moderator only)' })
  @ApiResponse({ status: 200, description: 'Service status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateServiceStatus(
    @Param('id') id: string,
    @Body('status') status: ServiceStatus,
  ) {
    return this.marketplaceService.updateServiceStatus(id, status);
  }

  @Post('services/:id/refresh-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh service statistics' })
  @ApiResponse({ status: 200, description: 'Statistics refreshed successfully' })
  @HttpCode(HttpStatus.OK)
  async refreshServiceStats(@Param('id') id: string) {
    await Promise.all([
      this.marketplaceService.updateServiceRating(id),
      this.marketplaceService.updateServiceStats(id),
    ]);
    
    return { message: 'Service statistics refreshed successfully' };
  }

  @Delete('services/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete service listing' })
  @ApiResponse({ status: 200, description: 'Service deleted successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @HttpCode(HttpStatus.OK)
  async deleteService(@Param('id') id: string) {
    await this.marketplaceService.deleteService(id);
    return { message: 'Service deleted successfully' };
  }
}
