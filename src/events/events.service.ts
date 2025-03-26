import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "./entities/event.entity";
import { CreateEventDto } from "./dto/create-event.dto";
import { PaginatedResult } from "../common/interfaces/result.interface";

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private eventRepository: Repository<Event>,
  ) {}

  async createEvent(dto: CreateEventDto): Promise<Event> {
    const newEvent = this.eventRepository.create(dto);
    return this.eventRepository.save(newEvent);
  }

  async getAllEvents(
    page?: number,
    limit?: number,
    filters?: { name?: string; category?: string; location?: string },
  ): Promise<PaginatedResult<Event>> {
    const query = this.eventRepository.createQueryBuilder("event");

    // Filtering logic
    if (filters.name) {
      query.andWhere("LOWER(event.eventName) LIKE LOWER(:name)", {
        name: `%${filters.name}%`,
      });
    }

    if (filters.category) {
      query.andWhere("LOWER(event.eventCategory) LIKE LOWER(:category)", {
        category: `%${filters.category}%`,
      });
    }

    if (filters.location) {
      query.andWhere(
        "LOWER(event.country) LIKE LOWER(:location) OR LOWER(event.state) LIKE LOWER(:location) OR LOWER(event.street) LIKE LOWER(:location) OR LOWER(event.localGovernment) LIKE LOWER(:location)",
        { location: `%${filters.location}%` },
      );
    }

    // Pagination logic
    const total = await query.getCount();
    const events = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  async archiveEvent(id: string) {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException("Event not Found");
    }
    event.isArchived = true;
    return this.eventRepository.softDelete(id);
  }

  async deleteEvent(id: string): Promise<void> {
    const result = await this.eventRepository.delete(id);
    if (!result.affected) throw new NotFoundException("Event not found");
  }
}
