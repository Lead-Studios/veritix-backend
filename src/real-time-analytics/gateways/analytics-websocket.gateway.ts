import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

export interface AnalyticsSubscription {
  eventId: string;
  userId: string;
  organizerId: string;
  subscriptions: {
    ticketSales: boolean;
    demographics: boolean;
    sentiment: boolean;
    revenue: boolean;
    alerts: boolean;
    recommendations: boolean;
  };
  filters?: {
    timeframe?: 'real-time' | 'hourly' | 'daily';
    metrics?: string[];
    platforms?: string[];
  };
}

export interface AnalyticsUpdate {
  type: 'ticket_sales' | 'demographics' | 'sentiment' | 'revenue' | 'alert' | 'recommendation';
  eventId: string;
  timestamp: Date;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
@WebSocketGateway({
  namespace: '/analytics',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(JwtAuthGuard)
export class AnalyticsWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalyticsWebSocketGateway.name);
  private connectedClients = new Map<string, Socket>();
  private subscriptions = new Map<string, AnalyticsSubscription>();
  private eventSubscribers = new Map<string, Set<string>>(); // eventId -> Set of socketIds
  private userConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(private configService: ConfigService) {}

  afterInit(server: Server) {
    this.logger.log('Analytics WebSocket Gateway initialized');
    
    // Set up periodic cleanup of stale connections
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000); // Every 30 seconds
  }

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.auth?.userId;
      const organizerId = client.handshake.auth?.organizerId;

      if (!userId || !organizerId) {
        this.logger.warn(`Connection rejected: Missing auth data for ${client.id}`);
        client.disconnect();
        return;
      }

      this.connectedClients.set(client.id, client);
      
      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId).add(client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${userId}, Organizer: ${organizerId})`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to analytics stream',
        timestamp: new Date(),
        capabilities: [
          'ticket_sales',
          'demographics',
          'sentiment',
          'revenue',
          'alerts',
          'recommendations',
        ],
      });

    } catch (error) {
      this.logger.error(`Connection error for ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId;
    
    this.connectedClients.delete(client.id);
    this.subscriptions.delete(client.id);

    // Clean up event subscriptions
    this.eventSubscribers.forEach((subscribers, eventId) => {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.eventSubscribers.delete(eventId);
      }
    });

    // Clean up user connections
    if (userId && this.userConnections.has(userId)) {
      this.userConnections.get(userId).delete(client.id);
      if (this.userConnections.get(userId).size === 0) {
        this.userConnections.delete(userId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_to_event')
  async handleEventSubscription(
    @MessageBody() data: {
      eventId: string;
      subscriptions: AnalyticsSubscription['subscriptions'];
      filters?: AnalyticsSubscription['filters'];
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.handshake.auth?.userId;
      const organizerId = client.handshake.auth?.organizerId;

      if (!userId || !organizerId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      // TODO: Verify user has access to this event
      // const hasAccess = await this.verifyEventAccess(userId, organizerId, data.eventId);
      // if (!hasAccess) {
      //   client.emit('error', { message: 'Access denied to event analytics' });
      //   return;
      // }

      const subscription: AnalyticsSubscription = {
        eventId: data.eventId,
        userId,
        organizerId,
        subscriptions: data.subscriptions,
        filters: data.filters,
      };

      this.subscriptions.set(client.id, subscription);

      // Add to event subscribers
      if (!this.eventSubscribers.has(data.eventId)) {
        this.eventSubscribers.set(data.eventId, new Set());
      }
      this.eventSubscribers.get(data.eventId).add(client.id);

      client.emit('subscription_confirmed', {
        eventId: data.eventId,
        subscriptions: data.subscriptions,
        timestamp: new Date(),
      });

      // Send initial data snapshot
      await this.sendInitialSnapshot(client, subscription);

      this.logger.log(`Client ${client.id} subscribed to event ${data.eventId}`);

    } catch (error) {
      this.logger.error(`Subscription error for ${client.id}:`, error);
      client.emit('error', { message: 'Subscription failed' });
    }
  }

  @SubscribeMessage('unsubscribe_from_event')
  async handleEventUnsubscription(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const subscription = this.subscriptions.get(client.id);
      
      if (subscription && subscription.eventId === data.eventId) {
        this.subscriptions.delete(client.id);
        
        // Remove from event subscribers
        if (this.eventSubscribers.has(data.eventId)) {
          this.eventSubscribers.get(data.eventId).delete(client.id);
          if (this.eventSubscribers.get(data.eventId).size === 0) {
            this.eventSubscribers.delete(data.eventId);
          }
        }

        client.emit('unsubscription_confirmed', {
          eventId: data.eventId,
          timestamp: new Date(),
        });

        this.logger.log(`Client ${client.id} unsubscribed from event ${data.eventId}`);
      }

    } catch (error) {
      this.logger.error(`Unsubscription error for ${client.id}:`, error);
      client.emit('error', { message: 'Unsubscription failed' });
    }
  }

  @SubscribeMessage('update_subscription')
  async handleSubscriptionUpdate(
    @MessageBody() data: {
      subscriptions: AnalyticsSubscription['subscriptions'];
      filters?: AnalyticsSubscription['filters'];
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const subscription = this.subscriptions.get(client.id);
      
      if (subscription) {
        subscription.subscriptions = data.subscriptions;
        subscription.filters = data.filters;
        
        this.subscriptions.set(client.id, subscription);

        client.emit('subscription_updated', {
          subscriptions: data.subscriptions,
          filters: data.filters,
          timestamp: new Date(),
        });

        this.logger.log(`Client ${client.id} updated subscription`);
      }

    } catch (error) {
      this.logger.error(`Subscription update error for ${client.id}:`, error);
      client.emit('error', { message: 'Subscription update failed' });
    }
  }

  @SubscribeMessage('request_snapshot')
  async handleSnapshotRequest(
    @MessageBody() data: { eventId: string; type?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const subscription = this.subscriptions.get(client.id);
      
      if (subscription && subscription.eventId === data.eventId) {
        await this.sendInitialSnapshot(client, subscription, data.type);
      } else {
        client.emit('error', { message: 'No active subscription for this event' });
      }

    } catch (error) {
      this.logger.error(`Snapshot request error for ${client.id}:`, error);
      client.emit('error', { message: 'Snapshot request failed' });
    }
  }

  // Public methods for broadcasting updates
  async broadcastAnalyticsUpdate(update: AnalyticsUpdate) {
    const subscribers = this.eventSubscribers.get(update.eventId);
    
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const filteredSubscribers = Array.from(subscribers).filter(socketId => {
      const subscription = this.subscriptions.get(socketId);
      return subscription && this.shouldReceiveUpdate(subscription, update);
    });

    if (filteredSubscribers.length === 0) {
      return;
    }

    const payload = {
      type: update.type,
      eventId: update.eventId,
      timestamp: update.timestamp,
      data: update.data,
      priority: update.priority,
    };

    filteredSubscribers.forEach(socketId => {
      const client = this.connectedClients.get(socketId);
      if (client) {
        client.emit('analytics_update', payload);
      }
    });

    this.logger.debug(`Broadcasted ${update.type} update to ${filteredSubscribers.length} clients`);
  }

  async broadcastAlert(eventId: string, alert: any) {
    const update: AnalyticsUpdate = {
      type: 'alert',
      eventId,
      timestamp: new Date(),
      data: alert,
      priority: alert.severity || 'medium',
    };

    await this.broadcastAnalyticsUpdate(update);
  }

  async broadcastRecommendation(eventId: string, recommendation: any) {
    const update: AnalyticsUpdate = {
      type: 'recommendation',
      eventId,
      timestamp: new Date(),
      data: recommendation,
      priority: recommendation.priority || 'medium',
    };

    await this.broadcastAnalyticsUpdate(update);
  }

  // Connection management
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getEventSubscribersCount(eventId: string): number {
    return this.eventSubscribers.get(eventId)?.size || 0;
  }

  getUserConnectionsCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  async disconnectUser(userId: string) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.forEach(socketId => {
        const client = this.connectedClients.get(socketId);
        if (client) {
          client.disconnect();
        }
      });
    }
  }

  // Private helper methods
  private shouldReceiveUpdate(
    subscription: AnalyticsSubscription,
    update: AnalyticsUpdate,
  ): boolean {
    // Check if subscribed to this update type
    switch (update.type) {
      case 'ticket_sales':
        return subscription.subscriptions.ticketSales;
      case 'demographics':
        return subscription.subscriptions.demographics;
      case 'sentiment':
        return subscription.subscriptions.sentiment;
      case 'revenue':
        return subscription.subscriptions.revenue;
      case 'alert':
        return subscription.subscriptions.alerts;
      case 'recommendation':
        return subscription.subscriptions.recommendations;
      default:
        return false;
    }
  }

  private async sendInitialSnapshot(
    client: Socket,
    subscription: AnalyticsSubscription,
    specificType?: string,
  ) {
    try {
      // TODO: Fetch current analytics data from services
      const snapshot = {
        eventId: subscription.eventId,
        timestamp: new Date(),
        data: {
          // This would be populated with actual data from analytics services
          ticketSales: subscription.subscriptions.ticketSales ? {} : null,
          demographics: subscription.subscriptions.demographics ? {} : null,
          sentiment: subscription.subscriptions.sentiment ? {} : null,
          revenue: subscription.subscriptions.revenue ? {} : null,
        },
      };

      client.emit('analytics_snapshot', snapshot);

    } catch (error) {
      this.logger.error(`Failed to send snapshot to ${client.id}:`, error);
      client.emit('error', { message: 'Failed to load analytics snapshot' });
    }
  }

  private cleanupStaleConnections() {
    const staleConnections: string[] = [];

    this.connectedClients.forEach((client, socketId) => {
      if (!client.connected) {
        staleConnections.push(socketId);
      }
    });

    staleConnections.forEach(socketId => {
      this.connectedClients.delete(socketId);
      this.subscriptions.delete(socketId);
      
      this.eventSubscribers.forEach((subscribers, eventId) => {
        subscribers.delete(socketId);
        if (subscribers.size === 0) {
          this.eventSubscribers.delete(eventId);
        }
      });
    });

    if (staleConnections.length > 0) {
      this.logger.log(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  // Health check method
  getGatewayHealth() {
    return {
      status: 'healthy',
      connectedClients: this.connectedClients.size,
      activeSubscriptions: this.subscriptions.size,
      trackedEvents: this.eventSubscribers.size,
      connectedUsers: this.userConnections.size,
      timestamp: new Date(),
    };
  }
}
