import { Ticket } from '../entities/ticket.entity';

export class TicketResource {
  static toResponse(ticket: Ticket) {
    return {
      id: ticket.id,
      name: ticket.name,
      event: ticket.event
        ? { id: ticket.event.id, name: ticket.event.name }
        : null,
      createdBy: ticket.createdBy
        ? { id: ticket.createdBy.id, email: ticket.createdBy.email }
        : null,
      quantity: ticket.quantity,
      price: ticket.price,
      description: ticket.description,
      deadlineDate: ticket.deadlineDate,
      isReserved: ticket.isReserved,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  static toArray(tickets: Ticket[]) {
    return tickets.map(TicketResource.toResponse);
  }
}
