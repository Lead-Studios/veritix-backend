import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { TicketHistory } from '../../ticket/entities/ticket-history.entity';
import { GalleryImage } from '../../event/entities/gallery-image.entity';
import { NotFoundException } from '@nestjs/common';
import { EventDashboardResource } from '../resources/event-dashboard.resource';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepo: Repository<TicketHistory>,
    @InjectRepository(GalleryImage)
    private readonly galleryImageRepo: Repository<GalleryImage>,
  ) {}

  async getAnalytics() {
    return {
      users: 1000,
      tickets: 500,
      revenue: 10000,
    };
  }

  async getEventDashboard(eventId: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['galleryImages'],
    });
    if (!event) throw new NotFoundException('Event not found');

    // Get total tickets sold and revenue
    const ticketHistories = await this.ticketHistoryRepo
      .createQueryBuilder('th')
      .leftJoin('th.ticket', 'ticket')
      .where('ticket.eventId = :eventId', { eventId })
      .getMany();
    const totalTicketsSold = ticketHistories.length;
    const totalRevenue = ticketHistories.reduce(
      (sum, th) => sum + Number(th.amount),
      0,
    );
    const totalProfit = totalRevenue - totalRevenue * 0.1;

    // Get total ticket quantity for the event
    const tickets = await this.ticketRepo.find({
      where: { event: { id: eventId } },
    });
    const ticketQuantity = tickets.reduce((sum, t) => sum + t.quantity, 0);
    const ticketsAvailable = ticketQuantity - totalTicketsSold;

    // Get event image (first image)
    const eventImage =
      event.galleryImages && event.galleryImages.length > 0
        ? event.galleryImages[0].imageUrl
        : null;

    return EventDashboardResource.toResponse({
      event,
      totalTicketsSold,
      totalRevenue,
      totalProfit,
      ticketsAvailable,
      eventImage,
    });
  }
}
