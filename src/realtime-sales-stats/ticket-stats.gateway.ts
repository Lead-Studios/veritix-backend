import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import {
  Logger,
  UseFilters,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { 
  TicketStatsDto, 
  TicketSaleUpdateDto, 
  EventSubscriptionDto 
} from './dto/ticket-stats.dto';
import { WsExceptionFilter } from './filters/ws-exception.filter';

@WebSocketGateway({
  namespace: 'ticket-stats',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@UseFilters(WsExceptionFilter)
export class TicketStatsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('TicketStatsGateway');
  private connectedClients = new Map<string, Socket>();

  constructor(private wsAuthGuard: WsAuthGuard) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client attempting to connect: ${client.id}`);

    // Authenticate the client
    const isAuthenticated = await this.wsAuthGuard.canActivate(client);

    if (!isAuthenticated) {
      this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
      client.disconnect();
      return;
    }

    this.connectedClients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id} (User: ${client.data.user.sub})`);

    // Send initial connection confirmation
    client.emit('connected', {
      message: 'Successfully connected to ticket stats',
      userId: client.data.user.sub,
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-to-event')
  handleSubscribeToEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EventSubscriptionDto,
  ) {
    const { eventId } = data;
    const organizerId = client.data.user.sub;

    this.logger.log(`Client ${client.id} subscribing to event ${eventId}`);

    // Join room for specific event
    client.join(`event-${eventId}`);

    client.emit('subscription-confirmed', {
      eventId,
      message: `Subscribed to real-time stats for event ${eventId}`,
      timestamp: new Date(),
    });

    return { success: true, eventId };
  }

  @SubscribeMessage('unsubscribe-from-event')
  handleUnsubscribeFromEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EventSubscriptionDto,
  ) {
    const { eventId } = data;
    
    this.logger.log(`Client ${client.id} unsubscribing from event ${eventId}`);
    
    client.leave(`event-${eventId}`);
    
    client.emit('unsubscription-confirmed', {
      eventId,
      message: `Unsubscribed from event ${eventId}`,
      timestamp: new Date(),
    });

    return { success: true, eventId };
  }

  @SubscribeMessage('get-current-stats')
  async handleGetCurrentStats(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EventSubscriptionDto,
  ) {
    const { eventId } = data;
    
    // Mock data - in real implementation, fetch from database
    const currentStats: TicketStatsDto = {
      eventId,
      totalTickets: 1000,
      soldTickets: 750,
      availableTickets: 250,
      revenue: 75000,
      salesVelocity: 12.5,
      lastUpdated: new Date(),
    };

    client.emit('current-stats', currentStats);
    return currentStats;
  }

  // Method to broadcast ticket sale updates (called from service)
  broadcastTicketSaleUpdate(update: TicketSaleUpdateDto) {
    const room = `event-${update.eventId}`;
    
    this.logger.log(`Broadcasting ticket sale update to room: ${room}`);
    
    this.server.to(room).emit('ticket-sale-update', {
      ...update,
      type: 'TICKET_SOLD',
    });
  }

  // Method to broadcast comprehensive stats update
  broadcastStatsUpdate(stats: TicketStatsDto) {
    const room = `event-${stats.eventId}`;
    
    this.logger.log(`Broadcasting stats update to room: ${room}`);
    
    this.server.to(room).emit('stats-update', stats);
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get clients in specific event room
  async getEventRoomSize(eventId: string): Promise<number> {
    const room = this.server.sockets.adapter.rooms.get(`event-${eventId}`);
    return room ? room.size : 0;
  }

  // Disconnect all clients (for testing)
  disconnectAll() {
    this.connectedClients.forEach((client) => {
      client.disconnect();
    });
    this.connectedClients.clear();
  }
}
