export interface Attendee {
  id: string;
  name: string;
  email: string;
  ticketId: string;
  purchaseDate: Date;
}

export interface EventStats {
  ticketsSold: number;
  ticketsRemaining: number;
  totalRevenue: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  organizerId: string;
  totalTickets: number;
  ticketPrice: number;
  stats: EventStats;
  attendees: Attendee[];
}

export interface OrganizerEventsResponse {
  organizerId: string;
  events: Event[];
}
