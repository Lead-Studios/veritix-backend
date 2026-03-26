import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guard/ws-jwt.guard';

export type ScanUpdatePayload = {
  eventId: string;
  totalScanned: number;
  remaining: number;
  lastScanAt: string;
};

type JoinEventPayload = {
  eventId: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class VerificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  async handleConnection(client: Socket): Promise<void> {
    this.wsJwtGuard.authenticateClient(client as Socket & { data: any });
  }

  handleDisconnect(_client: Socket): void {}

  @SubscribeMessage('join_event')
  @UseGuards(WsJwtGuard)
  async joinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinEventPayload,
  ): Promise<{ room: string; eventId: string }> {
    if (!payload?.eventId) {
      throw new WsException('eventId is required');
    }

    const room = this.getEventRoom(payload.eventId);
    await client.join(room);

    return {
      room,
      eventId: payload.eventId,
    };
  }

  emitScanUpdate(payload: ScanUpdatePayload): void {
    if (!this.server) {
      return;
    }

    this.server
      .to(this.getEventRoom(payload.eventId))
      .emit('scan_update', payload);
  }

  private getEventRoom(eventId: string): string {
    return `event:${eventId}`;
  }
}
