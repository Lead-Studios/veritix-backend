import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VipSectionService } from '../services/vip-section.service';

@ApiTags('VIP Section Management')
@Controller('vip-sections')
export class VipSectionController {
  constructor(private readonly vipSectionService: VipSectionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new VIP section' })
  @ApiResponse({ status: 201, description: 'VIP section created successfully' })
  async createVipSection(
    @Body() createVipSectionDto: {
      venueMapId: string;
      name: string;
      description?: string;
      vipType: 'luxury_box' | 'premium_seating' | 'vip_lounge' | 'corporate_box' | 'suite' | 'club_level' | 'field_level';
      accessLevel: 'standard_vip' | 'premium_vip' | 'platinum_vip' | 'diamond_vip' | 'executive';
      capacity: number;
      basePrice: number;
      packagePrice?: number;
      boundaries: {
        x: number;
        y: number;
        width: number;
        height: number;
        shape?: 'rectangle' | 'circle' | 'polygon';
        points?: Array<{ x: number; y: number }>;
      };
      amenities?: any;
      inclusions?: any;
      restrictions?: any;
      contactInfo?: any;
      colorCode?: string;
      priority?: number;
      requiresApproval?: boolean;
    }
  ) {
    return this.vipSectionService.createVipSection(createVipSectionDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get VIP section details' })
  @ApiResponse({ status: 200, description: 'VIP section retrieved successfully' })
  async getVipSection(@Param('id') id: string) {
    return this.vipSectionService.getVipSection(id);
  }

  @Get(':id/with-seats')
  @ApiOperation({ summary: 'Get VIP section with seat details and occupancy' })
  @ApiResponse({ status: 200, description: 'VIP section with seats retrieved successfully' })
  async getVipSectionWithSeats(@Param('id') id: string) {
    return this.vipSectionService.getVipSectionWithSeats(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update VIP section' })
  @ApiResponse({ status: 200, description: 'VIP section updated successfully' })
  async updateVipSection(
    @Param('id') id: string,
    @Body() updateData: any
  ) {
    return this.vipSectionService.updateVipSection(id, updateData);
  }

  @Get('venue/:venueMapId')
  @ApiOperation({ summary: 'Get all VIP sections for a venue' })
  @ApiResponse({ status: 200, description: 'VIP sections retrieved successfully' })
  async getVipSectionsByVenue(@Param('venueMapId') venueMapId: string) {
    return this.vipSectionService.getVipSectionsByVenue(venueMapId);
  }

  @Put(':id/assign-seats')
  @ApiOperation({ summary: 'Assign seats to VIP section' })
  @ApiResponse({ status: 200, description: 'Seats assigned successfully' })
  async assignSeatsToVipSection(
    @Param('id') id: string,
    @Body() body: { seatIds: string[] }
  ) {
    return this.vipSectionService.assignSeatsToVipSection(id, body.seatIds);
  }

  @Put(':id/remove-seats')
  @ApiOperation({ summary: 'Remove seats from VIP section' })
  @ApiResponse({ status: 200, description: 'Seats removed successfully' })
  async removeSeatsFromVipSection(
    @Param('id') id: string,
    @Body() body: { seatIds: string[] }
  ) {
    return this.vipSectionService.removeSeatsFromVipSection(id, body.seatIds);
  }

  @Post(':id/book')
  @ApiOperation({ summary: 'Book entire VIP section' })
  @ApiResponse({ status: 200, description: 'VIP section booked successfully' })
  async bookVipSection(
    @Param('id') id: string,
    @Body() bookingData: {
      sessionId: string;
      userId?: string;
      contactInfo: {
        name: string;
        email: string;
        phone?: string;
        organization?: string;
      };
      specialRequests?: string;
    }
  ) {
    return this.vipSectionService.bookVipSection(id, bookingData);
  }

  @Get('venue/:venueMapId/availability')
  @ApiOperation({ summary: 'Get VIP section availability for venue' })
  @ApiResponse({ status: 200, description: 'VIP availability retrieved successfully' })
  async getVipSectionAvailability(@Param('venueMapId') venueMapId: string) {
    return this.vipSectionService.getVipSectionAvailability(venueMapId);
  }

  @Put(':id/update-occupancy')
  @ApiOperation({ summary: 'Update VIP section occupancy counts' })
  @ApiResponse({ status: 200, description: 'Occupancy updated successfully' })
  async updateVipSectionOccupancy(@Param('id') id: string) {
    await this.vipSectionService.updateVipSectionOccupancy(id);
    return { success: true };
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get VIP section statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getVipSectionStats(@Query('venueMapId') venueMapId?: string) {
    return this.vipSectionService.getVipSectionStats(venueMapId);
  }

  @Get('venue/:venueMapId/revenue-analysis')
  @ApiOperation({ summary: 'Get VIP section revenue analysis' })
  @ApiResponse({ status: 200, description: 'Revenue analysis completed' })
  async getVipRevenueAnalysis(@Param('venueMapId') venueMapId: string) {
    const stats = await this.vipSectionService.getVipSectionStats(venueMapId);
    const availability = await this.vipSectionService.getVipSectionAvailability(venueMapId);

    return {
      currentRevenue: stats.totalRevenue,
      potentialRevenue: availability.sectionsByType,
      utilizationRate: {
        byType: availability.sectionsByType,
        byAccessLevel: availability.sectionsByAccessLevel,
      },
      recommendations: [
        'Consider dynamic pricing for premium VIP sections',
        'Offer package deals for corporate bookings',
        'Implement early bird discounts for VIP sections',
      ],
      lastUpdated: new Date(),
    };
  }

  @Get('templates/configurations')
  @ApiOperation({ summary: 'Get VIP section configuration templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getVipSectionTemplates() {
    return {
      templates: [
        {
          id: 'luxury-box',
          name: 'Luxury Box',
          vipType: 'luxury_box',
          accessLevel: 'platinum_vip',
          capacity: 12,
          basePrice: 200,
          packagePrice: 2000,
          amenities: {
            privateEntrance: true,
            dedicatedConcierge: true,
            premiumFood: true,
            openBar: true,
            vipParking: true,
            privateRestrooms: true,
            climateControl: true,
            premiumSeating: true,
            waitService: true,
            meetAndGreet: false,
            exclusiveLounge: true,
            customServices: ['Private chef available', 'Champagne service'],
          },
          inclusions: {
            food: ['Gourmet appetizers', 'Premium entrees', 'Dessert selection'],
            beverages: ['Premium wine', 'Top-shelf spirits', 'Craft cocktails'],
            services: ['Dedicated server', 'Coat check', 'Concierge'],
          },
        },
        {
          id: 'corporate-suite',
          name: 'Corporate Suite',
          vipType: 'corporate_box',
          accessLevel: 'executive',
          capacity: 20,
          basePrice: 150,
          packagePrice: 2500,
          amenities: {
            privateEntrance: true,
            dedicatedConcierge: true,
            premiumFood: true,
            openBar: false,
            vipParking: true,
            privateRestrooms: true,
            climateControl: true,
            premiumSeating: true,
            waitService: true,
            meetAndGreet: true,
            exclusiveLounge: false,
            customServices: ['AV equipment', 'Business center access'],
          },
          inclusions: {
            food: ['Business lunch menu', 'Coffee service', 'Light refreshments'],
            beverages: ['Wine selection', 'Beer', 'Non-alcoholic beverages'],
            services: ['Meeting setup', 'AV support', 'Business amenities'],
          },
        },
        {
          id: 'premium-club',
          name: 'Premium Club Level',
          vipType: 'club_level',
          accessLevel: 'premium_vip',
          capacity: 8,
          basePrice: 125,
          packagePrice: 900,
          amenities: {
            privateEntrance: false,
            dedicatedConcierge: false,
            premiumFood: true,
            openBar: false,
            vipParking: false,
            privateRestrooms: false,
            climateControl: true,
            premiumSeating: true,
            waitService: false,
            meetAndGreet: false,
            exclusiveLounge: true,
            customServices: ['Club lounge access'],
          },
          inclusions: {
            food: ['Club menu', 'Snacks'],
            beverages: ['House wine', 'Beer', 'Soft drinks'],
            services: ['Lounge access', 'Express entry'],
          },
        },
      ],
      pricingGuidelines: {
        luxury_box: { baseMultiplier: 3.0, packageMultiplier: 2.5 },
        corporate_box: { baseMultiplier: 2.5, packageMultiplier: 2.2 },
        suite: { baseMultiplier: 2.8, packageMultiplier: 2.4 },
        club_level: { baseMultiplier: 2.0, packageMultiplier: 1.8 },
        premium_seating: { baseMultiplier: 1.5, packageMultiplier: 1.4 },
      },
    };
  }

  @Post('venue/:venueMapId/optimize-layout')
  @ApiOperation({ summary: 'Optimize VIP section layout for revenue' })
  @ApiResponse({ status: 200, description: 'Layout optimization completed' })
  async optimizeVipLayout(
    @Param('venueMapId') venueMapId: string,
    @Body() body: {
      objectives: {
        maximizeRevenue?: boolean;
        maximizeCapacity?: boolean;
        balanceAccessLevels?: boolean;
      };
      constraints?: {
        minVipSections?: number;
        maxVipSections?: number;
        preserveExisting?: boolean;
      };
    }
  ) {
    // This would implement layout optimization algorithms
    return {
      optimizedLayout: {
        recommendedSections: [
          {
            type: 'luxury_box',
            count: 2,
            totalCapacity: 24,
            estimatedRevenue: 4000,
            placement: 'premium_locations',
          },
          {
            type: 'corporate_box',
            count: 3,
            totalCapacity: 60,
            estimatedRevenue: 7500,
            placement: 'mid_tier_locations',
          },
          {
            type: 'club_level',
            count: 4,
            totalCapacity: 32,
            estimatedRevenue: 3600,
            placement: 'elevated_sections',
          },
        ],
        totalEstimatedRevenue: 15100,
        revenueIncrease: '23%',
        capacityUtilization: '89%',
      },
      implementation: {
        phases: [
          'Phase 1: Create luxury boxes in premium locations',
          'Phase 2: Convert existing sections to corporate boxes',
          'Phase 3: Establish club level seating',
        ],
        timeline: '6-8 weeks',
        estimatedCost: 125000,
        roi: '18 months',
      },
    };
  }
}
