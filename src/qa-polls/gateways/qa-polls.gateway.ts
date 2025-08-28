import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { QuestionService } from '../services/question.service';
import { PollService } from '../services/poll.service';

@WebSocketGateway({
  namespace: 'qa-polls',
  cors: {
    origin: '*',
  },
})
export class QaPollsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly questionService: QuestionService,
    private readonly pollService: PollService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinEvent')
  async handleJoinEvent(
    @MessageBody() data: { eventId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `event-${data.eventId}`;
    await client.join(room);
    
    // Send current questions and polls to the newly joined client
    try {
      const questions = await this.questionService.findAll(data.eventId);
      const polls = await this.pollService.findActive(data.eventId);
      
      client.emit('questionsUpdate', questions);
      client.emit('pollsUpdate', polls);
    } catch (error) {
      client.emit('error', { message: 'Failed to load initial data' });
    }
  }

  @SubscribeMessage('leaveEvent')
  async handleLeaveEvent(
    @MessageBody() data: { eventId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `event-${data.eventId}`;
    await client.leave(room);
  }

  // Emit events for real-time updates
  async emitQuestionUpdate(eventId: string, question: any, action: 'created' | 'updated' | 'deleted' | 'voted') {
    const room = `event-${eventId}`;
    this.server.to(room).emit('questionUpdate', {
      action,
      question,
      timestamp: new Date(),
    });
  }

  async emitPollUpdate(eventId: string, poll: any, action: 'created' | 'updated' | 'deleted' | 'voted') {
    const room = `event-${eventId}`;
    this.server.to(room).emit('pollUpdate', {
      action,
      poll,
      timestamp: new Date(),
    });
  }

  async emitQuestionModerated(eventId: string, question: any) {
    const room = `event-${eventId}`;
    this.server.to(room).emit('questionModerated', {
      question,
      timestamp: new Date(),
    });
  }

  async emitPollModerated(eventId: string, poll: any) {
    const room = `event-${eventId}`;
    this.server.to(room).emit('pollModerated', {
      poll,
      timestamp: new Date(),
    });
  }

  async emitPollResults(eventId: string, pollId: string, results: any) {
    const room = `event-${eventId}`;
    this.server.to(room).emit('pollResults', {
      pollId,
      results,
      timestamp: new Date(),
    });
  }
}
