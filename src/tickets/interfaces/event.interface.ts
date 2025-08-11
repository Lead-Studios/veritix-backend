export interface Event {
  id: string;
  name: string;
  date: Date;
  location: string;
  availableTickets: number;
  pricePerTicket: number;

  // Resale policy fields
  maxResalePrice?: number;
  transferDeadline?: Date;
  resaleLocked?: boolean;
}
