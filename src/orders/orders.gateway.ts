import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

@WebSocketGateway({ cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Auth is enforced per-message via WsJwtGuard
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_order')
  handleJoinOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order:${data.orderId}`);
  }

  emitPaymentConfirmed(orderId: string, ticketCount: number) {
    this.server.to(`order:${orderId}`).emit('payment_confirmed', {
      orderId,
      status: 'PAID',
      ticketCount,
      message: 'Your tickets have been issued!',
    });
  }
}
