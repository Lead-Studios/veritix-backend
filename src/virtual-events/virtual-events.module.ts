import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Entities
import { VirtualEvent } from './entities/virtual-event.entity';
import { VirtualEventAttendee } from './entities/virtual-event-attendee.entity';
import { VirtualEventInteraction } from './entities/virtual-event-interaction.entity';
import { BreakoutRoom } from './entities/breakout-room.entity';
import { VirtualEventRecording } from './entities/virtual-event-recording.entity';
import { VirtualTicket } from './entities/virtual-ticket.entity';
import { HybridCheckIn } from './entities/hybrid-checkin.entity';

// Services
import { VirtualEventService } from './services/virtual-event.service';
import { StreamingPlatformService } from './services/streaming-platform.service';
import { VirtualInteractionService } from './services/virtual-interaction.service';
import { BreakoutRoomService } from './services/breakout-room.service';
import { RecordingService } from './services/recording.service';
import { VirtualAnalyticsService } from './services/virtual-analytics.service';
import { HybridCheckInService } from './services/hybrid-checkin.service';

// Controllers
import { VirtualEventController } from './controllers/virtual-event.controller';
import { VirtualInteractionController } from './controllers/virtual-interaction.controller';
import { BreakoutRoomController } from './controllers/breakout-room.controller';
import { RecordingController } from './controllers/recording.controller';
import { VirtualAnalyticsController } from './controllers/virtual-analytics.controller';
import { HybridCheckInController } from './controllers/hybrid-checkin.controller';

// Gateways
import { VirtualEventGateway } from './gateways/virtual-event.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VirtualEvent,
      VirtualEventAttendee,
      VirtualEventInteraction,
      BreakoutRoom,
      VirtualEventRecording,
      VirtualTicket,
      HybridCheckIn,
    ]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [
    VirtualEventController,
    VirtualInteractionController,
    BreakoutRoomController,
    RecordingController,
    VirtualAnalyticsController,
    HybridCheckInController,
  ],
  providers: [
    VirtualEventService,
    StreamingPlatformService,
    VirtualInteractionService,
    BreakoutRoomService,
    RecordingService,
    VirtualAnalyticsService,
    HybridCheckInService,
    VirtualEventGateway,
  ],
  exports: [
    VirtualEventService,
    StreamingPlatformService,
    VirtualInteractionService,
    BreakoutRoomService,
    RecordingService,
    VirtualAnalyticsService,
    HybridCheckInService,
    VirtualEventGateway,
  ],
})
export class VirtualEventsModule {}
