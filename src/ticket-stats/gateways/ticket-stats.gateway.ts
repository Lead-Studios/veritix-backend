import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import {
  Injectable,
  Logger,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { TicketStatsService } from '../services/ticket-stats.service';
import { TicketStats, TicketStatsUpdate } from '../types/ticket-stats.types';

@Injectable()
@WebSocketGateway({
  namespace: 'ticket-stats',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class TicketStatsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TicketStatsGateway.name);
  private connectedClients = new Map<string, { socket: Socket; userId: string; eventIds: string[] }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly ticketStatsService: TicketStatsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token);
      
      // Check if user is an organizer
      if (payload.role !== 'organizer') {
        throw new UnauthorizedException('Only organizers can access ticket stats');
      }

      this.connectedClients.set(client.id, {
        socket: client,
        userId: payload.sub,
        eventIds: [],
      });

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
      client.emit('connection_established', { message: 'Successfully connected to ticket stats' });
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.emit('connection_error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      // Leave all event rooms
      clientInfo.eventIds.forEach(eventId => {
        client.leave(`event:${eventId}`);
      });
      this.connectedClients.delete(client.id);
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('subscribe_to_event')
  async handleSubscribeToEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        throw new UnauthorizedException('Client not authenticated');
      }

      const { eventId } = data;
      
      // Verify user owns/organizes this event
      const hasAccess = await this.ticketStatsService.verifyOrganizerAccess(
        clientInfo.userId,
        eventId,
      );
      
      if (!hasAccess) {
        throw new UnauthorizedException('No access to this event');
      }

      // Join the event room
      client.join(`event:${eventId}`);
      clientInfo.eventIds.push(eventId);

      // Send initial stats
      const stats = await this.ticketStatsService.getTicketStats(eventId);
      client.emit('initial_stats', { eventId, stats });

      this.logger.log(`Client ${client.id} subscribed to event ${eventId}`);
      client.emit('subscription_confirmed', { eventId });
    } catch (error) {
      this.logger.error(`Subscription failed: ${error.message}`);
      client.emit('subscription_error', { 
        eventId: data.eventId, 
        message: error.message 
      });
    }
  }

  @SubscribeMessage('unsubscribe_from_event')
  async handleUnsubscribeFromEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      const { eventId } = data;
      client.leave(`event:${eventId}`);
      clientInfo.eventIds = clientInfo.eventIds.filter(id => id !== eventId);
      client.emit('unsubscription_confirmed', { eventId });
      this.logger.log(`Client ${client.id} unsubscribed from event ${eventId}`);
    }
  }

  @SubscribeMessage('get_stats')
  async handleGetStats(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        throw new UnauthorizedException('Client not authenticated');
      }

      const { eventId } = data;
      const hasAccess = await this.ticketStatsService.verifyOrganizerAccess(
        clientInfo.userId,
        eventId,
      );
      
      if (!hasAccess) {
        throw new UnauthorizedException('No access to this event');
      }

      const stats = await this.ticketStatsService.getTicketStats(eventId);
      client.emit('stats_data', { eventId, stats });
    } catch (error) {
      client.emit('stats_error', { 
        eventId: data.eventId, 
        message: error.message 
      });
    }
  }

  // Method to broadcast updates to all subscribers of an event
  async broadcastStatsUpdate(eventId: string, update: TicketStatsUpdate) {
    this.server.to(`event:${eventId}`).emit('stats_update', update);
    this.logger.log(`Broadcasted stats update for event ${eventId}`);
  }

  // Method to send updates to specific client
  async sendStatsToClient(clientId: string, eventId: string, stats: TicketStats) {
    const clientInfo = this.connectedClients.get(clientId);
    if (clientInfo) {
      clientInfo.socket.emit('stats_data', { eventId, stats });
    }
  }
}
