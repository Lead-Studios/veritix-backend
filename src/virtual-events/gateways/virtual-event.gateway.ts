import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { VirtualEventService } from '../services/virtual-event.service';
import { VirtualInteractionService } from '../services/virtual-interaction.service';
import { BreakoutRoomService } from '../services/breakout-room.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@WebSocketGateway({
  namespace: '/virtual-events',
  cors: {
    origin: '*',
  },
})
export class VirtualEventGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VirtualEventGateway.name);
  private connectedUsers = new Map<string, { userId: string; eventId: string; socket: Socket }>();

  constructor(
    private readonly virtualEventService: VirtualEventService,
    private readonly interactionService: VirtualInteractionService,
    private readonly breakoutRoomService: BreakoutRoomService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Virtual Events WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Find and remove user from connected users
    for (const [key, value] of this.connectedUsers.entries()) {
      if (value.socket.id === client.id) {
        // Leave virtual event
        try {
          await this.virtualEventService.leaveEvent(value.eventId, value.userId);
          this.server.to(`event-${value.eventId}`).emit('user-left', {
            userId: value.userId,
            timestamp: new Date(),
          });
        } catch (error) {
          this.logger.error('Error leaving event on disconnect', error);
        }
        
        this.connectedUsers.delete(key);
        break;
      }
    }
  }

  @SubscribeMessage('join-event')
  async handleJoinEvent(
    @MessageBody() data: { eventId: string; userId: string; guestInfo?: { name: string; email: string } },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const attendee = await this.virtualEventService.joinEvent(data.eventId, data.userId, data.guestInfo);
      
      // Join socket room
      client.join(`event-${data.eventId}`);
      
      // Store connection
      this.connectedUsers.set(`${data.eventId}-${data.userId}`, {
        userId: data.userId,
        eventId: data.eventId,
        socket: client,
      });

      // Notify other users
      client.to(`event-${data.eventId}`).emit('user-joined', {
        userId: data.userId,
        attendee,
        timestamp: new Date(),
      });

      return { success: true, attendee };
    } catch (error) {
      this.logger.error('Error joining event', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave-event')
  async handleLeaveEvent(
    @MessageBody() data: { eventId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.virtualEventService.leaveEvent(data.eventId, data.userId);
      
      // Leave socket room
      client.leave(`event-${data.eventId}`);
      
      // Remove connection
      this.connectedUsers.delete(`${data.eventId}-${data.userId}`);

      // Notify other users
      client.to(`event-${data.eventId}`).emit('user-left', {
        userId: data.userId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error leaving event', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send-chat')
  async handleSendChat(
    @MessageBody() data: { eventId: string; userId: string; message: string; isAnonymous?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const interaction = await this.interactionService.createInteraction({
        type: 'chat' as any,
        virtualEventId: data.eventId,
        userId: data.userId,
        content: data.message,
        isAnonymous: data.isAnonymous || false,
      });

      // Broadcast to all users in the event
      this.server.to(`event-${data.eventId}`).emit('chat-message', {
        interaction,
        timestamp: new Date(),
      });

      return { success: true, interaction };
    } catch (error) {
      this.logger.error('Error sending chat message', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('raise-hand')
  async handleRaiseHand(
    @MessageBody() data: { eventId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Update attendee status
      await this.virtualEventService.updateAttendeeStatus(data.eventId, data.userId, {
        isHandRaised: true,
      });

      // Notify moderators and hosts
      this.server.to(`event-${data.eventId}`).emit('hand-raised', {
        userId: data.userId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error raising hand', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('lower-hand')
  async handleLowerHand(
    @MessageBody() data: { eventId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.virtualEventService.updateAttendeeStatus(data.eventId, data.userId, {
        isHandRaised: false,
      });

      this.server.to(`event-${data.eventId}`).emit('hand-lowered', {
        userId: data.userId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error lowering hand', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send-reaction')
  async handleSendReaction(
    @MessageBody() data: { eventId: string; userId: string; reaction: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const interaction = await this.interactionService.createInteraction({
        type: 'reaction' as any,
        virtualEventId: data.eventId,
        userId: data.userId,
        content: data.reaction,
        metadata: { type: 'emoji' },
      });

      // Broadcast reaction
      this.server.to(`event-${data.eventId}`).emit('reaction', {
        userId: data.userId,
        reaction: data.reaction,
        timestamp: new Date(),
      });

      return { success: true, interaction };
    } catch (error) {
      this.logger.error('Error sending reaction', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('ask-question')
  async handleAskQuestion(
    @MessageBody() data: { eventId: string; userId: string; question: string; isAnonymous?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const interaction = await this.interactionService.createInteraction({
        type: 'qa' as any,
        virtualEventId: data.eventId,
        userId: data.userId,
        content: data.question,
        isAnonymous: data.isAnonymous || false,
      });

      // Notify moderators
      this.server.to(`event-${data.eventId}`).emit('new-question', {
        interaction,
        timestamp: new Date(),
      });

      return { success: true, interaction };
    } catch (error) {
      this.logger.error('Error asking question', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('join-breakout-room')
  async handleJoinBreakoutRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const room = await this.breakoutRoomService.joinBreakoutRoom(data.roomId, data.userId);
      
      // Join breakout room socket room
      client.join(`breakout-${data.roomId}`);

      // Notify other participants in breakout room
      client.to(`breakout-${data.roomId}`).emit('user-joined-breakout', {
        userId: data.userId,
        roomId: data.roomId,
        timestamp: new Date(),
      });

      return { success: true, room };
    } catch (error) {
      this.logger.error('Error joining breakout room', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave-breakout-room')
  async handleLeaveBreakoutRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.breakoutRoomService.leaveBreakoutRoom(data.roomId, data.userId);
      
      // Leave breakout room socket room
      client.leave(`breakout-${data.roomId}`);

      // Notify other participants
      client.to(`breakout-${data.roomId}`).emit('user-left-breakout', {
        userId: data.userId,
        roomId: data.roomId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error leaving breakout room', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('update-status')
  async handleUpdateStatus(
    @MessageBody() data: { eventId: string; userId: string; status: any },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.virtualEventService.updateAttendeeStatus(data.eventId, data.userId, data.status);

      // Notify other users of status change
      client.to(`event-${data.eventId}`).emit('user-status-updated', {
        userId: data.userId,
        status: data.status,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error updating status', error);
      return { success: false, error: error.message };
    }
  }

  // Admin/Moderator events
  @SubscribeMessage('start-event')
  async handleStartEvent(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const event = await this.virtualEventService.startEvent(data.eventId);

      // Notify all connected users
      this.server.to(`event-${data.eventId}`).emit('event-started', {
        event,
        timestamp: new Date(),
      });

      return { success: true, event };
    } catch (error) {
      this.logger.error('Error starting event', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('end-event')
  async handleEndEvent(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const event = await this.virtualEventService.endEvent(data.eventId);

      // Notify all connected users
      this.server.to(`event-${data.eventId}`).emit('event-ended', {
        event,
        timestamp: new Date(),
      });

      return { success: true, event };
    } catch (error) {
      this.logger.error('Error ending event', error);
      return { success: false, error: error.message };
    }
  }

  // Utility methods for external services to broadcast events
  broadcastToEvent(eventId: string, event: string, data: any) {
    this.server.to(`event-${eventId}`).emit(event, data);
  }

  broadcastToBreakoutRoom(roomId: string, event: string, data: any) {
    this.server.to(`breakout-${roomId}`).emit(event, data);
  }
}
