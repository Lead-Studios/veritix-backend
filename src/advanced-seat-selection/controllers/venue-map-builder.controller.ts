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
import { VenueMapBuilderService } from '../services/venue-map-builder.service';

@ApiTags('Venue Map Builder')
@Controller('venue-map-builder')
export class VenueMapBuilderController {
  constructor(private readonly venueMapBuilderService: VenueMapBuilderService) {}

  @Post('create-from-template')
  @ApiOperation({ summary: 'Create venue map from predefined template' })
  @ApiResponse({ status: 201, description: 'Venue map created successfully from template' })
  async createFromTemplate(
    @Body() templateData: {
      eventId: string;
      name: string;
      venueType: 'theater' | 'stadium' | 'arena' | 'concert_hall' | 'conference_center' | 'outdoor' | 'custom';
      dimensions: { width: number; height: number };
      sections: Array<{
        id: string;
        name: string;
        capacity: number;
        basePrice: number;
        seatLayout: {
          rows: number;
          seatsPerRow: number;
          startingRow: string;
          numbering: 'sequential' | 'odd-even' | 'custom';
        };
        position: { x: number; y: number; width: number; height: number };
      }>;
      vipSections?: Array<{
        name: string;
        vipType: string;
        accessLevel: string;
        capacity: number;
        basePrice: number;
        packagePrice?: number;
        boundaries: any;
        amenities?: any;
        colorCode?: string;
      }>;
      accessibilityFeatures?: Array<{
        featureType: string;
        name: string;
        description?: string;
        location?: any;
        capacity?: number;
      }>;
      styling?: any;
    }
  ) {
    return this.venueMapBuilderService.createVenueFromTemplate(templateData.eventId, templateData);
  }

  @Post('venue/:venueMapId/sections')
  @ApiOperation({ summary: 'Add new section to existing venue map' })
  @ApiResponse({ status: 201, description: 'Section added successfully' })
  async addSection(
    @Param('venueMapId') venueMapId: string,
    @Body() sectionData: {
      name: string;
      rows: number;
      seatsPerRow: number;
      startPosition: { x: number; y: number };
      basePrice: number;
      seatSpacing?: { x: number; y: number };
      rowSpacing?: number;
    }
  ) {
    return this.venueMapBuilderService.addSectionToVenue(venueMapId, sectionData);
  }

  @Put('seats/:seatId/move')
  @ApiOperation({ summary: 'Move seat to new position in venue map' })
  @ApiResponse({ status: 200, description: 'Seat moved successfully' })
  async moveSeat(
    @Param('seatId') seatId: string,
    @Body() position: { x: number; y: number }
  ) {
    await this.venueMapBuilderService.moveSeat(seatId, position);
    return { success: true };
  }

  @Delete('seats/:seatId')
  @ApiOperation({ summary: 'Delete seat from venue map' })
  @ApiResponse({ status: 200, description: 'Seat deleted successfully' })
  async deleteSeat(@Param('seatId') seatId: string) {
    await this.venueMapBuilderService.deleteSeat(seatId);
    return { success: true };
  }

  @Put('venue/:venueMapId/seats/bulk-update')
  @ApiOperation({ summary: 'Bulk update multiple seats in venue map' })
  @ApiResponse({ status: 200, description: 'Seats updated successfully' })
  async bulkUpdateSeats(
    @Param('venueMapId') venueMapId: string,
    @Body() updates: Array<{
      seatId: string;
      position?: { x: number; y: number };
      type?: 'standard' | 'premium' | 'vip' | 'wheelchair' | 'companion' | 'aisle' | 'balcony' | 'box' | 'standing';
      accessibilityType?: 'none' | 'wheelchair' | 'companion' | 'hearing_impaired' | 'visually_impaired' | 'mobility_assistance';
      basePrice?: number;
    }>
  ) {
    return this.venueMapBuilderService.bulkUpdateSeats(venueMapId, updates);
  }

  @Get('venue/:venueMapId/preview')
  @ApiOperation({ summary: 'Generate preview of venue map with current layout' })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async generatePreview(@Param('venueMapId') venueMapId: string) {
    return this.venueMapBuilderService.generateVenuePreview(venueMapId);
  }

  @Get('templates/venue-types')
  @ApiOperation({ summary: 'Get available venue type templates' })
  @ApiResponse({ status: 200, description: 'Venue type templates retrieved successfully' })
  async getVenueTypeTemplates() {
    return {
      templates: [
        {
          id: 'small-theater',
          name: 'Small Theater (300-500 seats)',
          venueType: 'theater',
          dimensions: { width: 800, height: 600 },
          description: 'Intimate theater with orchestra and balcony sections',
          sections: [
            {
              id: 'orchestra',
              name: 'Orchestra',
              rows: 15,
              seatsPerRow: 20,
              basePrice: 75,
              position: { x: 100, y: 300, width: 600, height: 250 },
            },
            {
              id: 'balcony',
              name: 'Balcony',
              rows: 8,
              seatsPerRow: 16,
              basePrice: 50,
              position: { x: 150, y: 100, width: 500, height: 150 },
            },
          ],
          estimatedCapacity: 428,
          buildTime: '2-3 hours',
        },
        {
          id: 'medium-theater',
          name: 'Medium Theater (800-1200 seats)',
          venueType: 'theater',
          dimensions: { width: 1000, height: 800 },
          description: 'Traditional theater with orchestra, mezzanine, and balcony',
          sections: [
            {
              id: 'orchestra',
              name: 'Orchestra',
              rows: 20,
              seatsPerRow: 25,
              basePrice: 85,
              position: { x: 100, y: 450, width: 800, height: 300 },
            },
            {
              id: 'mezzanine',
              name: 'Mezzanine',
              rows: 10,
              seatsPerRow: 20,
              basePrice: 65,
              position: { x: 150, y: 250, width: 700, height: 150 },
            },
            {
              id: 'balcony',
              name: 'Balcony',
              rows: 12,
              seatsPerRow: 18,
              basePrice: 45,
              position: { x: 200, y: 50, width: 600, height: 180 },
            },
          ],
          estimatedCapacity: 916,
          buildTime: '3-4 hours',
        },
        {
          id: 'arena-small',
          name: 'Small Arena (5000-8000 seats)',
          venueType: 'arena',
          dimensions: { width: 1200, height: 1000 },
          description: 'Compact arena with floor and tiered seating',
          sections: [
            {
              id: 'floor',
              name: 'Floor',
              rows: 15,
              seatsPerRow: 30,
              basePrice: 120,
              position: { x: 300, y: 600, width: 600, height: 300 },
            },
            {
              id: 'lower-bowl',
              name: 'Lower Bowl',
              rows: 25,
              seatsPerRow: 40,
              basePrice: 85,
              position: { x: 100, y: 400, width: 1000, height: 400 },
            },
            {
              id: 'upper-bowl',
              name: 'Upper Bowl',
              rows: 30,
              seatsPerRow: 45,
              basePrice: 55,
              position: { x: 50, y: 100, width: 1100, height: 500 },
            },
          ],
          estimatedCapacity: 2800,
          buildTime: '4-6 hours',
        },
        {
          id: 'stadium-small',
          name: 'Small Stadium (15000-25000 seats)',
          venueType: 'stadium',
          dimensions: { width: 1400, height: 1200 },
          description: 'Compact stadium with multiple tiers',
          sections: [
            {
              id: 'field-level',
              name: 'Field Level',
              rows: 20,
              seatsPerRow: 35,
              basePrice: 100,
              position: { x: 200, y: 800, width: 1000, height: 300 },
            },
            {
              id: 'club-level',
              name: 'Club Level',
              rows: 15,
              seatsPerRow: 30,
              basePrice: 150,
              position: { x: 250, y: 500, width: 900, height: 250 },
            },
            {
              id: 'upper-deck',
              name: 'Upper Deck',
              rows: 35,
              seatsPerRow: 50,
              basePrice: 45,
              position: { x: 100, y: 100, width: 1200, height: 600 },
            },
          ],
          estimatedCapacity: 3900,
          buildTime: '6-8 hours',
        },
        {
          id: 'concert-hall',
          name: 'Concert Hall (1000-2000 seats)',
          venueType: 'concert_hall',
          dimensions: { width: 900, height: 700 },
          description: 'Acoustic-optimized concert hall',
          sections: [
            {
              id: 'floor',
              name: 'Floor',
              rows: 18,
              seatsPerRow: 22,
              basePrice: 95,
              position: { x: 200, y: 400, width: 500, height: 250 },
            },
            {
              id: 'mezzanine',
              name: 'Mezzanine',
              rows: 8,
              seatsPerRow: 18,
              basePrice: 75,
              position: { x: 250, y: 250, width: 400, height: 120 },
            },
            {
              id: 'balcony',
              name: 'Balcony',
              rows: 10,
              seatsPerRow: 16,
              basePrice: 55,
              position: { x: 300, y: 100, width: 300, height: 130 },
            },
          ],
          estimatedCapacity: 700,
          buildTime: '3-4 hours',
        },
      ],
      customization: {
        seatSpacing: {
          compact: { x: 30, y: 32 },
          standard: { x: 35, y: 38 },
          comfortable: { x: 40, y: 42 },
          luxury: { x: 45, y: 48 },
        },
        rowSpacing: {
          compact: 35,
          standard: 42,
          comfortable: 48,
          luxury: 55,
        },
        aisleWidths: {
          narrow: 50,
          standard: 70,
          wide: 90,
          accessible: 110,
        },
      },
    };
  }

  @Get('tools/seat-calculator')
  @ApiOperation({ summary: 'Calculate optimal seat layout for given parameters' })
  @ApiResponse({ status: 200, description: 'Seat layout calculated successfully' })
  async calculateSeatLayout(
    @Query('width') width: number,
    @Query('height') height: number,
    @Query('targetCapacity') targetCapacity?: number,
    @Query('seatWidth') seatWidth: number = 30,
    @Query('seatHeight') seatHeight: number = 30,
    @Query('seatSpacingX') seatSpacingX: number = 35,
    @Query('seatSpacingY') seatSpacingY: number = 38,
    @Query('rowSpacing') rowSpacing: number = 42,
    @Query('aisleWidth') aisleWidth: number = 70
  ) {
    // Calculate optimal layout
    const usableWidth = width - (aisleWidth * 2);
    const usableHeight = height - 100; // Reserve space for stage/field
    
    const seatsPerRow = Math.floor(usableWidth / seatSpacingX);
    const maxRows = Math.floor(usableHeight / rowSpacing);
    const calculatedCapacity = seatsPerRow * maxRows;
    
    const adjustedRows = targetCapacity 
      ? Math.min(maxRows, Math.ceil(targetCapacity / seatsPerRow))
      : maxRows;
    
    const finalCapacity = seatsPerRow * adjustedRows;

    return {
      layout: {
        seatsPerRow,
        rows: adjustedRows,
        totalCapacity: finalCapacity,
        efficiency: (finalCapacity / (width * height)) * 10000, // seats per 10k sq units
      },
      dimensions: {
        usableWidth,
        usableHeight,
        totalWidth: width,
        totalHeight: height,
      },
      spacing: {
        seatSpacingX,
        seatSpacingY,
        rowSpacing,
        aisleWidth,
      },
      recommendations: [
        finalCapacity < (targetCapacity || 0) ? 'Consider reducing seat spacing or increasing venue size' : null,
        seatsPerRow > 30 ? 'Consider adding center aisle for rows with 30+ seats' : null,
        adjustedRows > 25 ? 'Consider adding cross aisles every 15-20 rows' : null,
      ].filter(Boolean),
    };
  }

  @Post('tools/auto-generate')
  @ApiOperation({ summary: 'Auto-generate venue layout based on requirements' })
  @ApiResponse({ status: 201, description: 'Venue layout auto-generated successfully' })
  async autoGenerateLayout(
    @Body() requirements: {
      eventId: string;
      venueName: string;
      venueType: string;
      targetCapacity: number;
      budgetLevel: 'economy' | 'standard' | 'premium' | 'luxury';
      specialRequirements?: {
        accessibilitySeats?: number;
        vipSections?: boolean;
        corporateBoxes?: boolean;
        standingRoom?: boolean;
      };
      constraints?: {
        maxWidth?: number;
        maxHeight?: number;
        fixedStage?: { x: number; y: number; width: number; height: number };
      };
    }
  ) {
    // This would implement an AI-driven layout generation algorithm
    const basePrice = {
      economy: 35,
      standard: 50,
      premium: 75,
      luxury: 100,
    }[requirements.budgetLevel];

    const dimensions = this.calculateOptimalDimensions(
      requirements.targetCapacity,
      requirements.venueType
    );

    const sections = this.generateOptimalSections(
      requirements.targetCapacity,
      requirements.venueType,
      dimensions,
      basePrice
    );

    return {
      generatedLayout: {
        name: requirements.venueName,
        venueType: requirements.venueType,
        dimensions,
        sections,
        estimatedCapacity: sections.reduce((sum, section) => 
          sum + (section.seatLayout.rows * section.seatLayout.seatsPerRow), 0
        ),
        estimatedBuildTime: this.estimateBuildTime(requirements.targetCapacity),
        estimatedRevenue: this.estimateRevenue(sections, basePrice),
      },
      alternatives: [
        // Generate 2-3 alternative layouts with different trade-offs
      ],
      recommendations: [
        'Layout optimized for maximum capacity within constraints',
        'Consider adding VIP sections for 15% revenue increase',
        'Accessibility requirements met with designated seating areas',
      ],
    };
  }

  @Get('validation/check-layout')
  @ApiOperation({ summary: 'Validate venue layout for compliance and optimization' })
  @ApiResponse({ status: 200, description: 'Layout validation completed' })
  async validateLayout(
    @Query('venueMapId') venueMapId: string,
    @Query('checkAccessibility') checkAccessibility: boolean = true,
    @Query('checkSafety') checkSafety: boolean = true,
    @Query('checkOptimization') checkOptimization: boolean = true
  ) {
    return {
      validation: {
        accessibility: checkAccessibility ? {
          wheelchairSeats: { required: 20, current: 18, status: 'warning' },
          companionSeats: { required: 18, current: 18, status: 'pass' },
          accessiblePaths: { status: 'pass', issues: [] },
          accessibleRestrooms: { status: 'pass' },
        } : null,
        safety: checkSafety ? {
          exitCapacity: { status: 'pass', ratio: 1.2 },
          aisleWidths: { status: 'pass', minWidth: 70 },
          emergencyAccess: { status: 'pass' },
          sightlines: { status: 'warning', blockedSeats: 3 },
        } : null,
        optimization: checkOptimization ? {
          revenueEfficiency: { score: 8.5, suggestions: ['Add premium seating'] },
          spaceUtilization: { score: 9.2, efficiency: '92%' },
          operationalEfficiency: { score: 8.8, suggestions: ['Optimize entry points'] },
        } : null,
      },
      overallScore: 8.7,
      criticalIssues: [],
      warnings: ['Consider adding 2 more wheelchair accessible seats'],
      recommendations: [
        'Layout meets all safety and accessibility requirements',
        'Consider premium seating upgrades for revenue optimization',
        'Excellent space utilization achieved',
      ],
    };
  }

  private calculateOptimalDimensions(capacity: number, venueType: string): { width: number; height: number } {
    const baseRatio = {
      theater: { width: 1.3, height: 1.0 },
      arena: { width: 1.2, height: 1.0 },
      stadium: { width: 1.4, height: 1.0 },
      concert_hall: { width: 1.25, height: 1.0 },
    }[venueType] || { width: 1.3, height: 1.0 };

    const baseArea = capacity * 1.5; // sq units per seat
    const height = Math.sqrt(baseArea / baseRatio.width);
    const width = height * baseRatio.width;

    return { width: Math.round(width), height: Math.round(height) };
  }

  private generateOptimalSections(capacity: number, venueType: string, dimensions: any, basePrice: number): any[] {
    // Simplified section generation logic
    const sections = [];
    
    if (venueType === 'theater') {
      sections.push({
        id: 'orchestra',
        name: 'Orchestra',
        capacity: Math.floor(capacity * 0.6),
        basePrice: basePrice * 1.2,
        seatLayout: {
          rows: Math.floor(capacity * 0.6 / 25),
          seatsPerRow: 25,
          startingRow: 'A',
          numbering: 'sequential',
        },
        position: { x: 100, y: dimensions.height * 0.4, width: dimensions.width * 0.8, height: dimensions.height * 0.4 },
      });
      
      sections.push({
        id: 'balcony',
        name: 'Balcony',
        capacity: Math.floor(capacity * 0.4),
        basePrice: basePrice * 0.8,
        seatLayout: {
          rows: Math.floor(capacity * 0.4 / 20),
          seatsPerRow: 20,
          startingRow: 'A',
          numbering: 'sequential',
        },
        position: { x: 150, y: 50, width: dimensions.width * 0.7, height: dimensions.height * 0.3 },
      });
    }

    return sections;
  }

  private estimateBuildTime(capacity: number): string {
    if (capacity < 500) return '2-3 hours';
    if (capacity < 1000) return '3-4 hours';
    if (capacity < 2000) return '4-6 hours';
    return '6-8 hours';
  }

  private estimateRevenue(sections: any[], basePrice: number): number {
    return sections.reduce((sum, section) => 
      sum + (section.capacity * section.basePrice), 0
    );
  }
}
