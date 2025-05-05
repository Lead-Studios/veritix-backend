import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeepPartial, Like, FindOptionsWhere } from "typeorm";
import { Event } from "./entities/event.entity";
import { CreateEventDto } from "./dto/create-event.dto";
import { PaginatedResult } from "../common/interfaces/result.interface";
import * as fuzzball from "fuzzball";
import { CategoryService } from "src/category/category.service";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventStatus } from "src/common/enums/event-status.enum";

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private eventRepository: Repository<Event>,
    private readonly categoryService: CategoryService,
  ) {}

  async create(
    dto: CreateEventDto,
    coverImage?: Express.Multer.File,
  ): Promise<Event> {
    const category = await this.categoryService.findOne(dto.category);
    if (!category) {
      throw new BadRequestException(
        `Category with ID ${dto.category} not found.`,
      );
    }

    const newEvent = this.eventRepository.create({
      eventName: dto.title,
      eventDescription: dto.description,
      eventDate: new Date(dto.startDate),
      eventClosingDate: new Date(dto.endDate),
      category: category,
      status: dto.status ?? EventStatus.DRAFT,
      eventImage: coverImage ? coverImage.path : null,
    });
    return this.eventRepository.save(newEvent);
  }

  async getAllEvents(
    page: number = 1,
    limit: number = 10,
    filters?: {
      name?: string;
      category?: string;
      location?: string;
      status?: EventStatus;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PaginatedResult<Event>> {
    const query = this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.category", "category");

    // Filtering logic
    if (filters.name) {
      query.andWhere("LOWER(event.eventName) LIKE LOWER(:name)", {
        name: `%${filters.name}%`,
      });
    }

    if (filters.category) {
      query.andWhere(
        "category.id = :categoryId OR LOWER(category.name) LIKE LOWER(:categoryName)",
        {
          categoryId: filters.category,
          categoryName: `%${filters.category}%`,
        },
      );
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
      relations: [
        "category",
        "tickets",
        "specialGuests",
        "collaborators",
        "sponsors",
        "posters",
        "eventGallery",
      ],
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async updateEvent(
    id: string,
    dto: UpdateEventDto,
    coverImage?: Express.Multer.File,
  ): Promise<Event> {
    const event = await this.getEventById(id);

    const updatePayload: DeepPartial<Event> = {};

    if (dto.title) updatePayload.eventName = dto.title;
    if (dto.description) updatePayload.eventDescription = dto.description;
    if (dto.startDate) updatePayload.eventDate = new Date(dto.startDate);
    if (dto.endDate) updatePayload.eventClosingDate = new Date(dto.endDate);
    if (dto.status) updatePayload.status = dto.status;

    if (dto.category) {
      const category = await this.categoryService.findOne(dto.category);
      if (!category) {
        throw new BadRequestException(
          `Category with ID ${dto.category} not found.`,
        );
      }
      updatePayload.category = category;
    } else {
      delete updatePayload.category;
    }

    if (coverImage) {
      // TODO: Optionally delete the old image file from storage
      updatePayload.eventImage = coverImage.path;
    } else {
      // Ensure image is not accidentally removed if not provided in DTO
      delete updatePayload.eventImage;
    }

    const updatedEvent = this.eventRepository.merge(event, updatePayload);
    await this.eventRepository.save(updatedEvent);

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

  async searchEvents(
    query: string,
    category?: string,
    location?: string,
    page = 1,
    limit = 10,
  ) {
    const whereOptions: FindOptionsWhere<Event> = {};

    if (category) {
      const categoryEntity = await this.categoryService
        .findOne(category)
        .catch(() => null);
      if (categoryEntity) {
        whereOptions.category = { id: categoryEntity.id };
      } else {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    const offset = (page - 1) * limit;

    const [allMatchingEvents, totalCountBeforeFuzzy] =
      await this.eventRepository.findAndCount({ where: whereOptions });

    // Apply fuzzy matching on the event name
    const filteredEvents = allMatchingEvents.filter((event) => {
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

  async publish(id: string): Promise<Event> {
    const event = await this.getEventById(id);
    if (event.status === EventStatus.PUBLISHED) {
      return event;
    }

    event.status = EventStatus.PUBLISHED;
    return this.eventRepository.save(event);
  }

  async unpublish(id: string): Promise<Event> {
    const event = await this.getEventById(id);
    if (event.status !== EventStatus.PUBLISHED) {
      return event;
    }
    event.status = EventStatus.DRAFT;
    return this.eventRepository.save(event);
  }

  async cancel(
    id: string,
    cancellationDetails: { reason: string; refundPolicy: string },
  ): Promise<Event> {
    const event = await this.getEventById(id);

    event.status = EventStatus.CANCELLED;

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
    const event = await this.getEventById(id);

    event.eventDate = postponementDetails.newStartDate;
    event.eventClosingDate = postponementDetails.newEndDate;

    return this.eventRepository.save(event);
  }
}
