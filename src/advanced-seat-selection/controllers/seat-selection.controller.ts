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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SeatSelectionService } from '../services/seat-selection.service';
import { SeatReservationService } from '../services/seat-reservation.service';
import { VenueMapService } from '../services/venue-map.service';

@ApiTags('Seat Selection')
@Controller('seat-selection')
export class SeatSelectionController {
  constructor(
    private readonly seatSelectionService: SeatSelectionService,
    private readonly seatReservationService: SeatReservationService,
    private readonly venueMapService: VenueMapService,
  ) {}

  @Get('venue/:venueMapId')
  @ApiOperation({ summary: 'Get venue map with seat availability' })
  @ApiResponse({ status: 200, description: 'Venue map retrieved successfully' })
  async getVenueMap(@Param('venueMapId') venueMapId: string) {
    return this.venueMapService.getVenueMapWithSVG(venueMapId);
  }

  @Get('venue/:venueMapId/availability')
  @ApiOperation({ summary: 'Get real-time seat availability for venue' })
  @ApiResponse({ status: 200, description: 'Seat availability retrieved successfully' })
  async getSeatAvailability(@Param('venueMapId') venueMapId: string) {
    return this.seatSelectionService.getSeatAvailability(venueMapId);
  }

  @Post('seat/:seatId/select')
  @ApiOperation({ summary: 'Select a seat for reservation' })
  @ApiResponse({ status: 200, description: 'Seat selected successfully' })
  @ApiResponse({ status: 400, description: 'Seat not available or invalid request' })
  async selectSeat(
    @Param('seatId') seatId: string,
    @Body() body: { sessionId: string; userId?: string }
  ) {
    return this.seatSelectionService.selectSeat(seatId, body.sessionId, body.userId);
  }

  @Delete('seat/:seatId/deselect')
  @ApiOperation({ summary: 'Deselect a previously selected seat' })
  @ApiResponse({ status: 200, description: 'Seat deselected successfully' })
  async deselectSeat(
    @Param('seatId') seatId: string,
    @Body() body: { sessionId: string }
  ) {
    return this.seatSelectionService.deselectSeat(seatId, body.sessionId);
  }

  @Get('seat/:seatId/details')
  @ApiOperation({ summary: 'Get detailed information about a specific seat' })
  @ApiResponse({ status: 200, description: 'Seat details retrieved successfully' })
  async getSeatDetails(@Param('seatId') seatId: string) {
    return this.seatSelectionService.getSeatDetails(seatId);
  }

  @Get('session/:sessionId/selected')
  @ApiOperation({ summary: 'Get all seats selected by a session' })
  @ApiResponse({ status: 200, description: 'Selected seats retrieved successfully' })
  async getSelectedSeats(@Param('sessionId') sessionId: string) {
    return this.seatSelectionService.getSelectedSeats(sessionId);
  }

  @Post('venue/:venueMapId/find-seats')
  @ApiOperation({ summary: 'Find best available seats based on preferences' })
  @ApiResponse({ status: 200, description: 'Best seats found successfully' })
  async findBestSeats(
    @Param('venueMapId') venueMapId: string,
    @Body() preferences: {
      quantity: number;
      sectionPreferences?: string[];
      priceRange?: { min: number; max: number };
      accessibilityRequired?: boolean;
      adjacentRequired?: boolean;
      maxRowSpread?: number;
    }
  ) {
    return this.seatSelectionService.findBestAvailableSeats(
      venueMapId,
      preferences.quantity,
      preferences
    );
  }

  @Put('reservation/:reservationId/extend')
  @ApiOperation({ summary: 'Extend seat reservation time' })
  @ApiResponse({ status: 200, description: 'Reservation extended successfully' })
  async extendReservation(
    @Param('reservationId') reservationId: string,
    @Body() body: { sessionId: string; extensionMinutes?: number }
  ) {
    return this.seatReservationService.extendReservation(
      reservationId,
      body.sessionId,
      body.extensionMinutes
    );
  }

  @Get('reservation/:reservationId')
  @ApiOperation({ summary: 'Get reservation details' })
  @ApiResponse({ status: 200, description: 'Reservation details retrieved successfully' })
  async getReservationDetails(@Param('reservationId') reservationId: string) {
    return this.seatReservationService.getReservationDetails(reservationId);
  }

  @Get('session/:sessionId/reservations')
  @ApiOperation({ summary: 'Get all active reservations for a session' })
  @ApiResponse({ status: 200, description: 'Reservations retrieved successfully' })
  async getSessionReservations(@Param('sessionId') sessionId: string) {
    return this.seatReservationService.getActiveReservations(sessionId);
  }

  @Delete('session/:sessionId/release-all')
  @ApiOperation({ summary: 'Release all seats held by a session' })
  @ApiResponse({ status: 200, description: 'All seats released successfully' })
  async releaseAllSeats(
    @Param('sessionId') sessionId: string,
    @Body() body?: { reason?: string }
  ) {
    const releasedCount = await this.seatReservationService.batchReleaseSeats(
      sessionId,
      undefined,
      body?.reason || 'session_ended'
    );
    return { releasedCount };
  }

  @Delete('reservation/:reservationId/release')
  @ApiOperation({ summary: 'Release a specific reservation' })
  @ApiResponse({ status: 200, description: 'Reservation released successfully' })
  async releaseReservation(
    @Param('reservationId') reservationId: string,
    @Body() body?: { reason?: string }
  ) {
    await this.seatReservationService.releaseReservation(
      reservationId,
      body?.reason || 'manual_release'
    );
    return { success: true };
  }

  @Put('reservation/:reservationId/complete')
  @ApiOperation({ summary: 'Complete a reservation (mark seat as sold)' })
  @ApiResponse({ status: 200, description: 'Reservation completed successfully' })
  async completeReservation(
    @Param('reservationId') reservationId: string,
    @Body() body: { completionReference: string }
  ) {
    await this.seatReservationService.completeReservation(
      reservationId,
      body.completionReference
    );
    return { success: true };
  }

  @Put('reservation/:reservationId/upgrade')
  @ApiOperation({ summary: 'Upgrade reservation type (e.g., temporary to checkout)' })
  @ApiResponse({ status: 200, description: 'Reservation upgraded successfully' })
  async upgradeReservation(
    @Param('reservationId') reservationId: string,
    @Body() body: { 
      newType: 'temporary' | 'checkout' | 'hold' | 'group';
      extensionMinutes?: number;
    }
  ) {
    await this.seatReservationService.upgradeReservationType(
      reservationId,
      body.newType as any,
      body.extensionMinutes
    );
    return { success: true };
  }

  @Post('seats/bulk-update')
  @ApiOperation({ summary: 'Bulk update seat statuses' })
  @ApiResponse({ status: 200, description: 'Seats updated successfully' })
  async bulkUpdateSeats(
    @Body() body: {
      seatIds: string[];
      status: 'available' | 'sold' | 'blocked' | 'maintenance';
      metadata?: any;
    }
  ) {
    await this.seatSelectionService.bulkUpdateSeatStatus(
      body.seatIds,
      body.status as any,
      body.metadata
    );
    return { success: true, updatedCount: body.seatIds.length };
  }

  @Get('venue/:venueMapId/stats')
  @ApiOperation({ summary: 'Get venue seat selection statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getVenueStats(@Param('venueMapId') venueMapId: string) {
    return this.venueMapService.getVenueMapStats(venueMapId);
  }

  @Get('reservations/stats')
  @ApiOperation({ summary: 'Get reservation statistics' })
  @ApiResponse({ status: 200, description: 'Reservation statistics retrieved successfully' })
  async getReservationStats(@Query('venueMapId') venueMapId?: string) {
    return this.seatReservationService.getReservationStats(venueMapId);
  }

  @Post('cleanup/expired-reservations')
  @ApiOperation({ summary: 'Manually trigger cleanup of expired reservations' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async cleanupExpiredReservations(@Query('sessionId') sessionId?: string) {
    const releasedCount = await this.seatReservationService.releaseExpiredReservations(sessionId);
    return { releasedCount };
  }

  @Get('venue/:venueMapId/popular-seats')
  @ApiOperation({ summary: 'Get most popular seats in venue' })
  @ApiResponse({ status: 200, description: 'Popular seats retrieved successfully' })
  async getPopularSeats(
    @Param('venueMapId') venueMapId: string,
    @Query('limit') limit: number = 10
  ) {
    const seats = await this.seatSelectionService.findBestAvailableSeats(
      venueMapId,
      limit,
      { adjacentRequired: false }
    );

    return seats
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit)
      .map(seat => ({
        id: seat.id,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        label: seat.displayLabel,
        popularityScore: seat.popularityScore,
        selectionCount: seat.selectionCount,
        basePrice: seat.basePrice,
        type: seat.type,
      }));
  }

  @Get('venue/:venueMapId/price-distribution')
  @ApiOperation({ summary: 'Get seat price distribution for venue' })
  @ApiResponse({ status: 200, description: 'Price distribution retrieved successfully' })
  async getPriceDistribution(@Param('venueMapId') venueMapId: string) {
    const availability = await this.seatSelectionService.getSeatAvailability(venueMapId);
    const venueStats = await this.venueMapService.getVenueMapStats(venueMapId);

    return {
      availability,
      priceRanges: venueStats.seatStats.map(stat => ({
        type: stat.type,
        count: parseInt(stat.count),
        avgPrice: parseFloat(stat.avgPrice),
      })),
      lastUpdated: new Date(),
    };
  }
}
