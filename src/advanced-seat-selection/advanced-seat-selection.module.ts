import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { VenueMapService } from './services/venue-map.service';
import { TicketIntegrationService } from './services/ticket-integration.service';
import { SeatSelectionService } from './services/seat-selection.service';
import { SeatReservationService } from './services/seat-reservation.service';
import { GroupBookingService } from './services/group-booking.service';
import { VipSectionService } from './services/vip-section.service';
import { VenueMapBuilderService } from './services/venue-map-builder.service';

import { SeatSelectionController } from './controllers/seat-selection.controller';
import { VenueMapController } from './controllers/venue-map.controller';
import { GroupBookingController } from './controllers/group-booking.controller';
import { VipSectionController } from './controllers/vip-section.controller';
import { VenueMapBuilderController } from './controllers/venue-map-builder.controller';

import { VenueMap } from './entities/venue-map.entity';
import { EnhancedSeat } from './entities/enhanced-seat.entity';
import { SeatReservation } from './entities/seat-reservation.entity';
import { SeatPricingTier } from './entities/seat-pricing-tier.entity';
import { VipSection } from './entities/vip-section.entity';
import { GroupBooking } from './entities/group-booking.entity';
import { AccessibilityFeature } from './entities/accessibility-feature.entity';

import { SeatSelectionGateway } from './gateways/seat-selection.gateway';
import { SeatReservationProcessor } from './processors/seat-reservation.processor';

// Import existing seat-map entities for compatibility
import { SeatMap } from '../seat-map/entities/seat-map.entity';
import { Section } from '../seat-map/entities/section.entity';
import { Seat } from '../seat-map/entities/seat.entity';
import { SeatAssignment } from '../seat-map/entities/seat-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // New advanced entities
      VenueMap,
      EnhancedSeat,
      SeatReservation,
      SeatPricingTier,
      VipSection,
      GroupBooking,
      AccessibilityFeature,
      // Existing entities for compatibility
      SeatMap,
      Section,
      Seat,
      SeatAssignment,
    ]),
    BullModule.registerQueue({
      name: 'seat-reservation',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    SeatSelectionController,
    VenueMapController,
    GroupBookingController,
    VipSectionController,
    VenueMapBuilderController,
  ],
  providers: [
    VenueMapService,
    TicketIntegrationService,
    SeatSelectionService,
    SeatReservationService,
    GroupBookingService,
    VipSectionService,
    VenueMapBuilderService,
    SeatSelectionGateway,
    SeatReservationProcessor,
  ],
  exports: [
    VenueMapService,
    TicketIntegrationService,
    SeatSelectionService,
    SeatReservationService,
    GroupBookingService,
    VipSectionService,
  ],
})
export class AdvancedSeatSelectionModule {}
