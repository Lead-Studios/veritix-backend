import { TicketHistory } from '../entities/ticket-history.entity';

export class TicketReceiptResource {
  static toResponse(history: TicketHistory) {
    return {
      id: history.id,
      ticket: history.ticket?.name,
      amount: history.amount,
      purchaseDate: history.purchaseDate,
      transactionId: history.transactionId,
      event: history.ticket?.event,
      user: history.user?.email,
    };
  }
}
