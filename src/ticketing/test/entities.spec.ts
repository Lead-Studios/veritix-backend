import { Event } from '../entities/event.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';

describe('Entities', () => {
  describe('Event', () => {
    it('should create an event instance', () => {
      const event = new Event();
      event.name = 'Test Event';
      event.description = 'Test Description';
      event.startDate = new Date('2024-06-15T09:00:00');
      event.endDate = new Date('2024-06-15T18:00:00');
      event.location = 'Test Location';
      event.organizerId = 'organizer-1';
      event.ticketPrice = 99.99;
      event.maxCapacity = 100;
      event.isActive = true;

      expect(event.name).toBe('Test Event');
      expect(event.description).toBe('Test Description');
      expect(event.startDate).toEqual(new Date('2024-06-15T09:00:00'));
      expect(event.endDate).toEqual(new Date('2024-06-15T18:00:00'));
      expect(event.location).toBe('Test Location');
      expect(event.organizerId).toBe('organizer-1');
      expect(event.ticketPrice).toBe(99.99);
      expect(event.maxCapacity).toBe(100);
      expect(event.isActive).toBe(true);
    });
  });

  describe('Ticket', () => {
    it('should create a ticket instance', () => {
      const ticket = new Ticket();
      ticket.ticketNumber = 'TICKET-123';
      ticket.eventId = 'event-1';
      ticket.purchaserId = 'user-1';
      ticket.purchaserName = 'John Doe';
      ticket.purchaserEmail = 'john@example.com';
      ticket.qrCodeData = 'qr-data';
      ticket.qrCodeImage = 'qr-image';
      ticket.secureHash = 'secure-hash';
      ticket.status = TicketStatus.ACTIVE;
      ticket.pricePaid = 99.99;
      ticket.purchaseDate = new Date();

      expect(ticket.ticketNumber).toBe('TICKET-123');
      expect(ticket.eventId).toBe('event-1');
      expect(ticket.purchaserId).toBe('user-1');
      expect(ticket.purchaserName).toBe('John Doe');
      expect(ticket.purchaserEmail).toBe('john@example.com');
      expect(ticket.qrCodeData).toBe('qr-data');
      expect(ticket.qrCodeImage).toBe('qr-image');
      expect(ticket.secureHash).toBe('secure-hash');
      expect(ticket.status).toBe(TicketStatus.ACTIVE);
      expect(ticket.pricePaid).toBe(99.99);
      expect(ticket.purchaseDate).toBeDefined();
    });

    it('should validate ticket status enum', () => {
      expect(TicketStatus.ACTIVE).toBe('active');
      expect(TicketStatus.USED).toBe('used');
      expect(TicketStatus.CANCELLED).toBe('cancelled');
      expect(TicketStatus.EXPIRED).toBe('expired');
    });
  });
});
