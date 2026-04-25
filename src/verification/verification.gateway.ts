import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketType } from '../ticket-types/entities/ticket-type.entity';

@WebSocketGateway({ cors: { origin: '*' } })
export class VerificationGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
  ) {}

  afterInit() {
    // Gateway initialized
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_event')
  handleJoinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    void client.join(`event:${data.eventId}`);
    return { joined: `event:${data.eventId}` };
  }

  async emitScanUpdate(eventId: string) {
    const tickets = await this.ticketRepo.find({ where: { eventId } });
    const totalScanned = tickets.filter((t) => t.status === 'USED').length;

    const ticketTypes = await this.ticketTypeRepo.find({ where: { eventId } });
    const remaining = ticketTypes.reduce(
      (sum, tt) => sum + (tt.totalQuantity - tt.soldQuantity),
      0,
    );

    this.server.to(`event:${eventId}`).emit('scan_update', {
      eventId,
      totalScanned,
      remaining,
      lastScanAt: new Date().toISOString(),
    });
  }
}
