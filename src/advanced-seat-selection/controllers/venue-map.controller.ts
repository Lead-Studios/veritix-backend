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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VenueMapService } from '../services/venue-map.service';
import { VenueMapBuilderService } from '../services/venue-map-builder.service';

@ApiTags('Venue Map Management')
@Controller('venue-maps')
export class VenueMapController {
  constructor(
    private readonly venueMapService: VenueMapService,
    private readonly venueMapBuilderService: VenueMapBuilderService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new venue map' })
  @ApiResponse({ status: 201, description: 'Venue map created successfully' })
  async createVenueMap(
    @Body() createVenueMapDto: {
      name: string;
      description?: string;
      eventId: string;
      venueType: 'theater' | 'stadium' | 'arena' | 'concert_hall' | 'conference_center' | 'outdoor' | 'custom';
      mapConfiguration: {
        width: number;
        height: number;
        viewBox: string;
        scale: number;
        centerPoint: { x: number; y: number };
        gridSize?: number;
        snapToGrid?: boolean;
      };
      styling?: any;
      interactionSettings?: any;
    }
  ) {
    return this.venueMapService.createVenueMap(createVenueMapDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get venue map by ID' })
  @ApiResponse({ status: 200, description: 'Venue map retrieved successfully' })
  async getVenueMap(@Param('id') id: string) {
    return this.venueMapService.getVenueMap(id);
  }

  @Get(':id/with-svg')
  @ApiOperation({ summary: 'Get venue map with enhanced SVG and seat data' })
  @ApiResponse({ status: 200, description: 'Venue map with SVG retrieved successfully' })
  async getVenueMapWithSVG(@Param('id') id: string) {
    return this.venueMapService.getVenueMapWithSVG(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update venue map' })
  @ApiResponse({ status: 200, description: 'Venue map updated successfully' })
  async updateVenueMap(
    @Param('id') id: string,
    @Body() updateData: any
  ) {
    return this.venueMapService.updateVenueMap(id, updateData);
  }

  @Put(':id/publish')
  @ApiOperation({ summary: 'Publish venue map (make it active)' })
  @ApiResponse({ status: 200, description: 'Venue map published successfully' })
  async publishVenueMap(@Param('id') id: string) {
    return this.venueMapService.publishVenueMap(id);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive venue map' })
  @ApiResponse({ status: 200, description: 'Venue map archived successfully' })
  async archiveVenueMap(@Param('id') id: string) {
    return this.venueMapService.archiveVenueMap(id);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get all venue maps for an event' })
  @ApiResponse({ status: 200, description: 'Venue maps retrieved successfully' })
  async getVenueMapsByEvent(@Param('eventId') eventId: string) {
    return this.venueMapService.getVenueMapsByEvent(eventId);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone venue map for a new event' })
  @ApiResponse({ status: 201, description: 'Venue map cloned successfully' })
  async cloneVenueMap(
    @Param('id') id: string,
    @Body() cloneData: {
      newEventId: string;
      newName: string;
    }
  ) {
    return this.venueMapService.cloneVenueMap(id, cloneData.newEventId, cloneData.newName);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get venue map statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getVenueMapStats(@Param('id') id: string) {
    return this.venueMapService.getVenueMapStats(id);
  }

  @Put(':id/update-counts')
  @ApiOperation({ summary: 'Manually update seat counts for venue map' })
  @ApiResponse({ status: 200, description: 'Seat counts updated successfully' })
  async updateSeatCounts(@Param('id') id: string) {
    await this.venueMapService.updateSeatCounts(id);
    return { success: true };
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create venue map from template' })
  @ApiResponse({ status: 201, description: 'Venue map created from template successfully' })
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
      vipSections?: any[];
      accessibilityFeatures?: any[];
      styling?: any;
    }
  ) {
    return this.venueMapBuilderService.createVenueFromTemplate(templateData.eventId, templateData);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Generate venue map preview' })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async generatePreview(@Param('id') id: string) {
    return this.venueMapBuilderService.generateVenuePreview(id);
  }

  @Post(':id/sections')
  @ApiOperation({ summary: 'Add section to venue map' })
  @ApiResponse({ status: 201, description: 'Section added successfully' })
  async addSection(
    @Param('id') venueMapId: string,
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
  @ApiOperation({ summary: 'Move seat to new position' })
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

  @Put(':id/seats/bulk-update')
  @ApiOperation({ summary: 'Bulk update seats in venue map' })
  @ApiResponse({ status: 200, description: 'Seats updated successfully' })
  async bulkUpdateSeats(
    @Param('id') venueMapId: string,
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

  @Get('templates/presets')
  @ApiOperation({ summary: 'Get predefined venue templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getVenueTemplates() {
    return {
      templates: [
        {
          id: 'theater-small',
          name: 'Small Theater',
          venueType: 'theater',
          dimensions: { width: 800, height: 600 },
          description: 'Traditional theater layout with orchestra and balcony',
          sections: [
            {
              id: 'orchestra',
              name: 'Orchestra',
              rows: 15,
              seatsPerRow: 20,
              basePrice: 75,
              position: { x: 100, y: 200 },
            },
            {
              id: 'balcony',
              name: 'Balcony',
              rows: 8,
              seatsPerRow: 16,
              basePrice: 50,
              position: { x: 150, y: 50 },
            },
          ],
        },
        {
          id: 'stadium-large',
          name: 'Large Stadium',
          venueType: 'stadium',
          dimensions: { width: 1200, height: 800 },
          description: 'Multi-tier stadium with field-level seating',
          sections: [
            {
              id: 'field-level',
              name: 'Field Level',
              rows: 20,
              seatsPerRow: 30,
              basePrice: 100,
              position: { x: 50, y: 500 },
            },
            {
              id: 'club-level',
              name: 'Club Level',
              rows: 15,
              seatsPerRow: 25,
              basePrice: 150,
              position: { x: 100, y: 300 },
            },
            {
              id: 'upper-deck',
              name: 'Upper Deck',
              rows: 25,
              seatsPerRow: 35,
              basePrice: 50,
              position: { x: 25, y: 50 },
            },
          ],
        },
        {
          id: 'concert-hall',
          name: 'Concert Hall',
          venueType: 'concert_hall',
          dimensions: { width: 900, height: 700 },
          description: 'Intimate concert hall with premium acoustics',
          sections: [
            {
              id: 'floor',
              name: 'Floor',
              rows: 12,
              seatsPerRow: 18,
              basePrice: 85,
              position: { x: 200, y: 400 },
            },
            {
              id: 'mezzanine',
              name: 'Mezzanine',
              rows: 6,
              seatsPerRow: 14,
              basePrice: 65,
              position: { x: 250, y: 250 },
            },
          ],
        },
      ],
    };
  }

  @Get('venue-types/configurations')
  @ApiOperation({ summary: 'Get default configurations for different venue types' })
  @ApiResponse({ status: 200, description: 'Configurations retrieved successfully' })
  async getVenueTypeConfigurations() {
    return {
      configurations: {
        theater: {
          defaultDimensions: { width: 800, height: 600 },
          seatSpacing: { x: 35, y: 40 },
          rowSpacing: 45,
          aisleWidth: 60,
          defaultSections: ['orchestra', 'mezzanine', 'balcony'],
        },
        stadium: {
          defaultDimensions: { width: 1200, height: 800 },
          seatSpacing: { x: 30, y: 35 },
          rowSpacing: 40,
          aisleWidth: 80,
          defaultSections: ['field-level', 'club-level', 'upper-deck'],
        },
        arena: {
          defaultDimensions: { width: 1000, height: 800 },
          seatSpacing: { x: 32, y: 38 },
          rowSpacing: 42,
          aisleWidth: 70,
          defaultSections: ['floor', 'lower-bowl', 'upper-bowl'],
        },
        concert_hall: {
          defaultDimensions: { width: 900, height: 700 },
          seatSpacing: { x: 38, y: 42 },
          rowSpacing: 48,
          aisleWidth: 65,
          defaultSections: ['floor', 'mezzanine', 'balcony'],
        },
      },
    };
  }
}
