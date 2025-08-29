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
import { VendorService } from '../services/vendor.service';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';
import { VendorQueryDto } from '../dto/vendor-query.dto';
import { VendorStatus, VendorTier } from '../entities/vendor.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('Vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @ApiOperation({ summary: 'Register as a vendor' })
  @ApiResponse({ status: 201, description: 'Vendor registration successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorService.create(createVendorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendors with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully' })
  async findAll(@Query() query: VendorQueryDto) {
    return this.vendorService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured vendors' })
  @ApiResponse({ status: 200, description: 'Featured vendors retrieved successfully' })
  async getFeatured(@Query('limit') limit?: number) {
    return this.vendorService.getFeaturedVendors(limit);
  }

  @Get('top-rated')
  @ApiOperation({ summary: 'Get top-rated vendors' })
  @ApiResponse({ status: 200, description: 'Top-rated vendors retrieved successfully' })
  async getTopRated(@Query('limit') limit?: number) {
    return this.vendorService.getTopRatedVendors(limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search vendors' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async search(
    @Query('q') searchTerm: string,
    @Query('serviceType') serviceType?: string,
    @Query('location') location?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('rating') rating?: number,
  ) {
    const filters: any = {};
    
    if (serviceType) filters.serviceType = serviceType;
    if (location) filters.location = location;
    if (minPrice || maxPrice) {
      filters.priceRange = { min: minPrice || 0, max: maxPrice || 999999 };
    }
    if (rating) filters.rating = rating;

    return this.vendorService.searchVendors(searchTerm, filters);
  }

  @Get('my-profile')
  @ApiOperation({ summary: 'Get current user vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vendor profile not found' })
  async getMyProfile(@GetUser('id') userId: string) {
    return this.vendorService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async findOne(@Param('id') id: string) {
    return this.vendorService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor updated successfully' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorService.update(id, updateVendorDto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Update vendor status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: VendorStatus,
  ) {
    return this.vendorService.updateStatus(id, status);
  }

  @Patch(':id/tier')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update vendor tier (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor tier updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateTier(
    @Param('id') id: string,
    @Body('tier') tier: VendorTier,
  ) {
    return this.vendorService.updateTier(id, tier);
  }

  @Post(':id/refresh-stats')
  @ApiOperation({ summary: 'Refresh vendor statistics' })
  @ApiResponse({ status: 200, description: 'Statistics refreshed successfully' })
  @HttpCode(HttpStatus.OK)
  async refreshStats(@Param('id') id: string) {
    await Promise.all([
      this.vendorService.updateRating(id),
      this.vendorService.updateStats(id),
    ]);
    
    return { message: 'Statistics refreshed successfully' };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete vendor (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vendor deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.vendorService.remove(id);
    return { message: 'Vendor deleted successfully' };
  }
}
