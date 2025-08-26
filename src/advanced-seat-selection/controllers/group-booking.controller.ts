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
import { GroupBookingService } from '../services/group-booking.service';

@ApiTags('Group Booking')
@Controller('group-booking')
export class GroupBookingController {
  constructor(private readonly groupBookingService: GroupBookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group booking request' })
  @ApiResponse({ status: 201, description: 'Group booking created successfully' })
  async createGroupBooking(
    @Body() createGroupBookingDto: {
      venueMapId: string;
      sessionId: string;
      userId?: string;
      groupName: string;
      requestedSeats: number;
      bookingType: 'adjacent' | 'same_row' | 'same_section' | 'flexible' | 'custom';
      preferences?: {
        sectionPreferences?: string[];
        priceRange?: { min: number; max: number };
        accessibilityRequired?: boolean;
        wheelchairSeats?: number;
        companionSeats?: number;
        avoidSections?: string[];
        preferredRows?: string[];
        maxRowSpread?: number;
        allowSplit?: boolean;
      };
      contactInfo?: {
        name: string;
        email: string;
        phone?: string;
        organization?: string;
        specialRequests?: string;
      };
    }
  ) {
    return this.groupBookingService.createGroupBooking(createGroupBookingDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group booking details' })
  @ApiResponse({ status: 200, description: 'Group booking retrieved successfully' })
  async getGroupBooking(@Param('id') id: string) {
    return this.groupBookingService.getGroupBooking(id);
  }

  @Post(':id/find-and-reserve')
  @ApiOperation({ summary: 'Find and reserve seats for group booking' })
  @ApiResponse({ status: 200, description: 'Seats found and reserved successfully' })
  async findAndReserveSeats(@Param('id') id: string) {
    return this.groupBookingService.findAndReserveSeats(id);
  }

  @Put(':id/add-seats')
  @ApiOperation({ summary: 'Add specific seats to group booking' })
  @ApiResponse({ status: 200, description: 'Seats added successfully' })
  async addSeatsToGroupBooking(
    @Param('id') id: string,
    @Body() body: { seatIds: string[] }
  ) {
    return this.groupBookingService.addSeatsToGroupBooking(id, body.seatIds);
  }

  @Put(':id/remove-seats')
  @ApiOperation({ summary: 'Remove seats from group booking' })
  @ApiResponse({ status: 200, description: 'Seats removed successfully' })
  async removeSeatsFromGroupBooking(
    @Param('id') id: string,
    @Body() body: { seatIds: string[] }
  ) {
    return this.groupBookingService.removeSeatsFromGroupBooking(id, body.seatIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel group booking' })
  @ApiResponse({ status: 200, description: 'Group booking cancelled successfully' })
  async cancelGroupBooking(
    @Param('id') id: string,
    @Body() body?: { reason?: string }
  ) {
    await this.groupBookingService.cancelGroupBooking(id, body?.reason);
    return { success: true };
  }

  @Get('venue/:venueMapId/suggestions')
  @ApiOperation({ summary: 'Get group booking suggestions for venue' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved successfully' })
  async getGroupBookingSuggestions(
    @Param('venueMapId') venueMapId: string,
    @Query('quantity') quantity: number,
    @Query('bookingType') bookingType?: string,
    @Query('maxPrice') maxPrice?: number
  ) {
    // This would typically call a service method to analyze available seats
    // and provide intelligent suggestions for group bookings
    return {
      suggestions: [
        {
          type: 'adjacent_seats',
          description: 'Best adjacent seats available',
          sections: ['Section A', 'Section B'],
          estimatedPrice: maxPrice ? Math.min(quantity * 75, maxPrice) : quantity * 75,
          fulfillmentRate: 100,
        },
        {
          type: 'same_section',
          description: 'Seats in same section with minimal row spread',
          sections: ['Section C'],
          estimatedPrice: quantity * 65,
          fulfillmentRate: 90,
        },
        {
          type: 'flexible',
          description: 'Best value across multiple sections',
          sections: ['Section D', 'Section E'],
          estimatedPrice: quantity * 55,
          fulfillmentRate: 100,
        },
      ],
      discountInfo: {
        availableDiscounts: [
          { minSeats: 5, discount: 5, description: '5% off for 5+ seats' },
          { minSeats: 10, discount: 10, description: '10% off for 10+ seats' },
          { minSeats: 20, discount: 15, description: '15% off for 20+ seats' },
        ],
        applicableDiscount: quantity >= 20 ? 15 : quantity >= 10 ? 10 : quantity >= 5 ? 5 : 0,
      },
    };
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get group booking statistics overview' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getGroupBookingStats(@Query('venueMapId') venueMapId?: string) {
    return this.groupBookingService.getGroupBookingStats(venueMapId);
  }

  @Get('venue/:venueMapId/capacity-analysis')
  @ApiOperation({ summary: 'Analyze group booking capacity for venue' })
  @ApiResponse({ status: 200, description: 'Capacity analysis completed' })
  async analyzeGroupCapacity(
    @Param('venueMapId') venueMapId: string,
    @Query('maxGroupSize') maxGroupSize: number = 50
  ) {
    // This would analyze the venue layout to determine optimal group sizes
    return {
      analysis: {
        maxAdjacentSeats: 12,
        maxSameRowSeats: 20,
        maxSameSectionSeats: 100,
        recommendedGroupSizes: [5, 8, 10, 12, 15, 20, 25],
        sectionCapacities: [
          { sectionId: 'section-a', name: 'Section A', capacity: 200, maxGroupSize: 25 },
          { sectionId: 'section-b', name: 'Section B', capacity: 150, maxGroupSize: 20 },
          { sectionId: 'section-c', name: 'Section C', capacity: 180, maxGroupSize: 22 },
        ],
        adjacencyMatrix: {
          'section-a': ['section-b'],
          'section-b': ['section-a', 'section-c'],
          'section-c': ['section-b'],
        },
      },
      recommendations: [
        'For groups of 5-8: Adjacent seating available in all sections',
        'For groups of 10-15: Same row seating recommended in Sections A and C',
        'For groups of 20+: Consider splitting across adjacent sections',
      ],
    };
  }

  @Post('venue/:venueMapId/optimize')
  @ApiOperation({ summary: 'Optimize seat allocation for multiple group bookings' })
  @ApiResponse({ status: 200, description: 'Optimization completed successfully' })
  async optimizeGroupAllocations(
    @Param('venueMapId') venueMapId: string,
    @Body() body: {
      groupRequests: Array<{
        id: string;
        requestedSeats: number;
        bookingType: string;
        priority: number;
        preferences?: any;
      }>;
      optimizationGoals: {
        maximizeRevenue?: boolean;
        maximizeSatisfaction?: boolean;
        minimizeFragmentation?: boolean;
      };
    }
  ) {
    // This would implement an optimization algorithm to allocate seats
    // across multiple group bookings to maximize the specified goals
    return {
      optimizedAllocations: body.groupRequests.map(request => ({
        groupId: request.id,
        recommendedSeats: [], // Would contain actual seat recommendations
        fulfillmentRate: 95,
        estimatedSatisfactionScore: 8.5,
        alternativeOptions: 2,
      })),
      overallMetrics: {
        totalRevenue: 15750,
        averageSatisfaction: 8.2,
        venueUtilization: 87,
        fragmentationScore: 0.15,
      },
    };
  }

  @Get('templates/common-configurations')
  @ApiOperation({ summary: 'Get common group booking configurations' })
  @ApiResponse({ status: 200, description: 'Configurations retrieved successfully' })
  async getCommonConfigurations() {
    return {
      configurations: [
        {
          name: 'Corporate Event',
          description: 'Standard corporate group booking',
          recommendedSizes: [10, 15, 20, 25],
          bookingType: 'same_section',
          preferences: {
            accessibilityRequired: true,
            wheelchairSeats: 2,
            companionSeats: 2,
          },
          discountTiers: [
            { minSeats: 10, discount: 8 },
            { minSeats: 20, discount: 12 },
          ],
        },
        {
          name: 'School Group',
          description: 'Educational institution group booking',
          recommendedSizes: [15, 20, 30, 40],
          bookingType: 'flexible',
          preferences: {
            maxRowSpread: 3,
            allowSplit: true,
          },
          discountTiers: [
            { minSeats: 15, discount: 15 },
            { minSeats: 30, discount: 20 },
          ],
        },
        {
          name: 'Family Reunion',
          description: 'Large family group booking',
          recommendedSizes: [8, 12, 16, 20],
          bookingType: 'adjacent',
          preferences: {
            accessibilityRequired: true,
            maxRowSpread: 2,
          },
          discountTiers: [
            { minSeats: 8, discount: 5 },
            { minSeats: 15, discount: 10 },
          ],
        },
        {
          name: 'Sports Team',
          description: 'Athletic team and supporters',
          recommendedSizes: [12, 18, 24, 30],
          bookingType: 'same_section',
          preferences: {
            allowSplit: false,
            maxRowSpread: 4,
          },
          discountTiers: [
            { minSeats: 12, discount: 10 },
            { minSeats: 24, discount: 15 },
          ],
        },
      ],
    };
  }
}
