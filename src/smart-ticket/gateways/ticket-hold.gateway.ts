import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from "@nestjs/platform-socket.io"
import { Logger } from "@nestjs/common"
import type { Server, Socket } from "socket.io"

@WebSocketGateway({
  cors: {
    origin: "*", // Adjust this to your frontend's origin in production
    methods: ["GET", "POST"],
  },
})
export class TicketHoldGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(TicketHoldGateway.name)

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`)
    // You might want to associate client.id with a user ID here
    // client.join(`user-${userId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage("message") // Example: Listen for a 'message' event from clients
  handleMessage(client: Socket, payload: any): void {
    this.logger.log(`Received message from ${client.id}: ${JSON.stringify(payload)}`)
    client.emit("message", `Server received your message: ${payload}`) // Echo back
  }

  /**
   * Emits a 'ticket-re-released' event to all connected clients.
   * In a real application, you might want to emit to specific users or rooms (e.g., event-specific rooms).
   * @param eventId The ID of the event whose tickets were re-released.
   * @param ticketTypeId The ID of the ticket type that was re-released.
   * @param quantity The quantity of tickets re-released.
   */
  emitTicketReReleased(eventId: string, ticketTypeId: string, quantity: number) {
    const payload = { eventId, ticketTypeId, quantity, timestamp: new Date().toISOString() }
    this.server.emit("ticket-re-released", payload)
    this.logger.debug(
      `Emitted 'ticket-re-released' for event ${eventId}, ticketType ${ticketTypeId}, quantity ${quantity}`,
    )
  }
}
