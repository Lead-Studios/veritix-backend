import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "./entities/event.entity";
import { CreateEventDto } from "./dto/create-event.dto";
import { Ticket } from "../tickets/entities/ticket.entity";
import { SpecialGuest } from "../special-guests/entities/special-guest.entity";

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private eventRepository: Repository<Event>,
    @InjectRepository(Ticket) private ticketRepository: Repository<Ticket>,
    @InjectRepository(SpecialGuest)
    private specialGuestRepository: Repository<SpecialGuest>,
  ) {}

  async createEvent(dto: CreateEventDto): Promise<Event> {
    const newEvent = this.eventRepository.create(dto);
    return this.eventRepository.save(newEvent);
  }

  async getAllEvents(): Promise<Event[]> {
    return this.eventRepository.find({
      relations: ["tickets", "specialGuests"],
    });
  }

  async getEventById(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ["tickets", "specialGuests"],
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async updateEvent(id: string, dto: Partial<CreateEventDto>): Promise<Event> {
    await this.eventRepository.update(id, dto);
    return this.getEventById(id);
  }

  async deleteEvent(id: string): Promise<void> {
    const result = await this.eventRepository.delete(id);
    if (!result.affected) throw new NotFoundException("Event not found");
  }

  async getTicketsForEvent(eventId: string): Promise<Ticket[]> {
    return this.ticketRepository.find({ where: { event: { id: eventId } } });
  }

  async getSpecialGuestsForEvent(eventId: string): Promise<SpecialGuest[]> {
    return this.specialGuestRepository.find({
      where: { event: { id: eventId } },
    });
  }
}
