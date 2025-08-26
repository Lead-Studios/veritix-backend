import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { SeatSelectionService } from '../services/seat-selection.service';
import { SeatReservationService } from '../services/seat-reservation.service';

interface SeatSelectionClient extends Socket {
  venueMapId?: string;
  sessionId?: string;
  userId?: string;
}

@Injectable()
@WebSocketGateway({
  namespace: '/seat-selection',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class SeatSelectionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SeatSelectionGateway.name);
  private clientSessions = new Map<string, Set<string>>(); // venueMapId -> Set of socketIds

  constructor(
    private readonly seatSelectionService: SeatSelectionService,
    private readonly seatReservationService: SeatReservationService,
  ) {}

  async handleConnection(client: SeatSelectionClient) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: SeatSelectionClient) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    if (client.venueMapId) {
      const sessions = this.clientSessions.get(client.venueMapId);
      if (sessions) {
        sessions.delete(client.id);
        if (sessions.size === 0) {
          this.clientSessions.delete(client.venueMapId);
        }
      }
    }

    // Release any held seats for this client
    if (client.sessionId) {
      await this.seatReservationService.releaseExpiredReservations(client.sessionId);
    }
  }

  @SubscribeMessage('join-venue')
  async handleJoinVenue(
    @MessageBody() data: { venueMapId: string; sessionId: string; userId?: string },
    @ConnectedSocket() client: SeatSelectionClient,
  ) {
    try {
      client.venueMapId = data.venueMapId;
      client.sessionId = data.sessionId;
      client.userId = data.userId;

      await client.join(`venue:${data.venueMapId}`);

      if (!this.clientSessions.has(data.venueMapId)) {
        this.clientSessions.set(data.venueMapId, new Set());
      }
      this.clientSessions.get(data.venueMapId).add(client.id);

      // Send current seat availability
      const seatAvailability = await this.seatSelectionService.getSeatAvailability(data.venueMapId);
      client.emit('seat-availability', seatAvailability);

      this.logger.log(`Client ${client.id} joined venue ${data.venueMapId}`);
    } catch (error) {
      this.logger.error(`Error joining venue: ${error.message}`);
      client.emit('error', { message: 'Failed to join venue' });
    }
  }

  @SubscribeMessage('leave-venue')
  async handleLeaveVenue(@ConnectedSocket() client: SeatSelectionClient) {
    if (client.venueMapId) {
      await client.leave(`venue:${client.venueMapId}`);
      
      const sessions = this.clientSessions.get(client.venueMapId);
      if (sessions) {
        sessions.delete(client.id);
      }

      client.venueMapId = undefined;
    }
  }

  @SubscribeMessage('select-seat')
  async handleSelectSeat(
    @MessageBody() data: { seatId: string; venueMapId: string; sessionId: string },
    @ConnectedSocket() client: SeatSelectionClient,
  ) {
    try {
      const result = await this.seatSelectionService.selectSeat(
        data.seatId,
        data.sessionId,
        client.userId,
      );

      if (result.success) {
        // Notify all clients in this venue about the seat selection
        this.server.to(`venue:${data.venueMapId}`).emit('seat-selected', {
          seatId: data.seatId,
          sessionId: data.sessionId,
          reservedUntil: result.reservedUntil,
        });

        client.emit('seat-selection-success', result);
      } else {
        client.emit('seat-selection-failed', result);
      }
    } catch (error) {
      this.logger.error(`Error selecting seat: ${error.message}`);
      client.emit('seat-selection-failed', { 
        success: false, 
        message: 'Failed to select seat' 
      });
    }
  }

  @SubscribeMessage('deselect-seat')
  async handleDeselectSeat(
    @MessageBody() data: { seatId: string; venueMapId: string; sessionId: string },
    @ConnectedSocket() client: SeatSelectionClient,
  ) {
    try {
      const result = await this.seatSelectionService.deselectSeat(
        data.seatId,
        data.sessionId,
      );

      if (result.success) {
        // Notify all clients in this venue about the seat deselection
        this.server.to(`venue:${data.venueMapId}`).emit('seat-deselected', {
          seatId: data.seatId,
          sessionId: data.sessionId,
        });

        client.emit('seat-deselection-success', result);
      } else {
        client.emit('seat-deselection-failed', result);
      }
    } catch (error) {
      this.logger.error(`Error deselecting seat: ${error.message}`);
      client.emit('seat-deselection-failed', { 
        success: false, 
        message: 'Failed to deselect seat' 
      });
    }
  }

  @SubscribeMessage('extend-reservation')
  async handleExtendReservation(
    @MessageBody() data: { seatId: string; sessionId: string },
    @ConnectedSocket() client: SeatSelectionClient,
  ) {
    try {
      const result = await this.seatReservationService.extendReservation(
        data.seatId,
        data.sessionId,
      );

      if (result.success) {
        client.emit('reservation-extended', result);
      } else {
        client.emit('reservation-extension-failed', result);
      }
    } catch (error) {
      this.logger.error(`Error extending reservation: ${error.message}`);
      client.emit('reservation-extension-failed', { 
        success: false, 
        message: 'Failed to extend reservation' 
      });
    }
  }

  @SubscribeMessage('get-seat-details')
  async handleGetSeatDetails(
    @MessageBody() data: { seatId: string },
    @ConnectedSocket() client: SeatSelectionClient,
  ) {
    try {
      const seatDetails = await this.seatSelectionService.getSeatDetails(data.seatId);
      client.emit('seat-details', seatDetails);
    } catch (error) {
      this.logger.error(`Error getting seat details: ${error.message}`);
      client.emit('error', { message: 'Failed to get seat details' });
    }
  }

  // Server-side methods to broadcast updates
  async broadcastSeatUpdate(venueMapId: string, seatUpdate: any) {
    this.server.to(`venue:${venueMapId}`).emit('seat-updated', seatUpdate);
  }

  async broadcastSeatAvailability(venueMapId: string, availability: any) {
    this.server.to(`venue:${venueMapId}`).emit('seat-availability-updated', availability);
  }

  async broadcastReservationExpired(venueMapId: string, seatId: string, sessionId: string) {
    this.server.to(`venue:${venueMapId}`).emit('reservation-expired', {
      seatId,
      sessionId,
    });
  }

  async broadcastSeatSold(venueMapId: string, seatId: string) {
    this.server.to(`venue:${venueMapId}`).emit('seat-sold', {
      seatId,
    });
  }

  async notifyGroupBookingUpdate(venueMapId: string, groupBookingId: string, update: any) {
    this.server.to(`venue:${venueMapId}`).emit('group-booking-updated', {
      groupBookingId,
      ...update,
    });
  }

  getConnectedClientsCount(venueMapId: string): number {
    const sessions = this.clientSessions.get(venueMapId);
    return sessions ? sessions.size : 0;
  }

  getActiveVenues(): string[] {
    return Array.from(this.clientSessions.keys());
  }
}
