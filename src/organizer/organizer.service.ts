import { Injectable } from '@nestjs/common';
import {
  Event,
  Attendee,
  OrganizerEventsResponse,
  EventStats,
} from '../dto/event.dto';

@Injectable()
export class OrganizerService {
  // Mock data - in a real app, this would come from a database
  private mockEvents: Event[] = [
    {
      id: '1',
      title: 'Tech Conference 2025',
      description: 'Annual technology conference',
      date: new Date('2025-10-15'),
      location: 'San Francisco, CA',
      organizerId: 'org1',
      totalTickets: 500,
      ticketPrice: 150,
      stats: {
        ticketsSold: 350,
        ticketsRemaining: 150,
        totalRevenue: 52500,
      },
      attendees: [
        {
          id: 'att1',
          name: 'John Doe',
          email: 'john@example.com',
          ticketId: 'tkt1',
          purchaseDate: new Date('2025-09-01'),
        },
        {
          id: 'att2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          ticketId: 'tkt2',
          purchaseDate: new Date('2025-09-02'),
        },
      ],
    },
    {
      id: '2',
      title: 'Music Festival',
      description: 'Summer music festival',
      date: new Date('2025-07-20'),
      location: 'Austin, TX',
      organizerId: 'org1',
      totalTickets: 1000,
      ticketPrice: 100,
      stats: {
        ticketsSold: 800,
        ticketsRemaining: 200,
        totalRevenue: 80000,
      },
      attendees: [
        {
          id: 'att3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          ticketId: 'tkt3',
          purchaseDate: new Date('2025-08-15'),
        },
      ],
    },
  ];

  async getOrganizerEvents(
    organizerId: string,
  ): Promise<OrganizerEventsResponse> {
    // In a real app, this would query the database
    const events = this.mockEvents.filter(
      (event) => event.organizerId === organizerId,
    );

    return {
      organizerId,
      events,
    };
  }
}
