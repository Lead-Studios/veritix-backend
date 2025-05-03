import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeepPartial } from "typeorm";
import { Event } from "./entities/event.entity";
import { CreateEventDto } from "./dto/create-event.dto";
import { PaginatedResult } from "../common/interfaces/result.interface";
import * as fuzzball from "fuzzball";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventStatus } from "../common/enums/event-status.enum";

@Injectable()
export class EventsService {
  eventRepo: any;
  categoryService: any;
  constructor(
    @InjectRepository(Event) private eventRepository: Repository<Event>,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    coverImage?: Express.Multer.File,
  ): Promise<Event> {
    // Create base event without relations
    const event = this.eventRepository.create({
      title: createEventDto.title,
      description: createEventDto.description,
      startDate: new Date(createEventDto.startDate),
      endDate: new Date(createEventDto.endDate),
      venue: createEventDto.venue,
      address: createEventDto.address,
      category: createEventDto.category,
      capacity: createEventDto.capacity,
      status: EventStatus.DRAFT,
    });

    // Save the base event first
    const savedEvent = await this.eventRepository.save(event);

    // Handle relations separately if needed
    // This would require additional repository injections and logic

    return savedEvent;
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    status?: EventStatus;
  }) {
    const { page = 1, limit = 10, status } = filters || {};
    const [events, total] = await this.eventRepository.findAndCount({
      where: status ? { status } : {},
      skip: (page - 1) * limit,
      take: limit,
    });
    return { events, total, page, limit };
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new Error("Event not found");
    }
    return event;
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    coverImage?: Express.Multer.File,
  ): Promise<Event> {
    const event = await this.findOne(id);

    // Update only the base properties
    if (updateEventDto.title) event.title = updateEventDto.title;
    if (updateEventDto.description)
      event.description = updateEventDto.description;
    if (updateEventDto.startDate)
      event.startDate = new Date(updateEventDto.startDate);
    if (updateEventDto.endDate)
      event.endDate = new Date(updateEventDto.endDate);
    if (updateEventDto.venue) event.venue = updateEventDto.venue;
    if (updateEventDto.address) event.address = updateEventDto.address;
    if (updateEventDto.category) event.category = updateEventDto.category;
    if (updateEventDto.capacity) event.capacity = updateEventDto.capacity;
    if (updateEventDto.status) event.status = updateEventDto.status;

    return this.eventRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.eventRepository.remove(event);
  }

  async publish(id: string): Promise<Event> {
    const event = await this.findOne(id);
    event.status = EventStatus.PUBLISHED;
    return this.eventRepository.save(event);
  }

  async unpublish(id: string): Promise<Event> {
    const event = await this.findOne(id);
    event.status = EventStatus.DRAFT;
    return this.eventRepository.save(event);
  }

  async cancel(
    id: string,
    cancellationDetails: { reason: string },
  ): Promise<Event> {
    const event = await this.findOne(id);
    event.status = EventStatus.CANCELLED;
    event.cancellationReason = cancellationDetails.reason;
    return this.eventRepository.save(event);
  }

  async postpone(
    id: string,
    postponementDetails: {
      newStartDate: Date;
      newEndDate: Date;
      reason: string;
    },
  ): Promise<Event> {
    const event = await this.findOne(id);
    event.status = EventStatus.POSTPONED;
    event.startDate = postponementDetails.newStartDate;
    event.endDate = postponementDetails.newEndDate;
    event.postponementReason = postponementDetails.reason;
    return this.eventRepository.save(event);
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
    const event = await this.findOne(id);

    // Update only the base properties
    if (dto.title) event.title = dto.title;
    if (dto.description) event.description = dto.description;
    if (dto.startDate) event.startDate = new Date(dto.startDate);
    if (dto.endDate) event.endDate = new Date(dto.endDate);
    if (dto.venue) event.venue = dto.venue;
    if (dto.address) event.address = dto.address;
    if (dto.category) event.category = dto.category;
    if (dto.capacity) event.capacity = dto.capacity;
    if (dto.status) event.status = dto.status;

    return this.eventRepository.save(event);
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

  async searchEvents(
    query: string,
    category?: string,
    location?: string,
    page = 1,
    limit = 10,
  ) {
    const offset = (page - 1) * limit;

    // Fetch events from the database
    const events = await this.eventRepository.find({
      where: {
        ...(category && { category }),
        ...(location && {
          address: location, // Using address field for location search
        }),
      },
    });

    // Apply fuzzy matching on the event title
    const filteredEvents = events.filter((event) => {
      const score = fuzzball.ratio(
        query.toLowerCase(),
        event.title.toLowerCase(),
      );
      return score > 70; // Threshold for fuzzy matching
    });

    // Sort by relevance (descending score)
    filteredEvents.sort(
      (a, b) =>
        fuzzball.ratio(query.toLowerCase(), b.title.toLowerCase()) -
        fuzzball.ratio(query.toLowerCase(), a.title.toLowerCase()),
    );

    // Paginate results
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    return {
      data: paginatedEvents,
      total: filteredEvents.length,
      page,
      limit,
    };
  }

  c853433e47ca51f47fb67b7d9df970af4d574;
}
