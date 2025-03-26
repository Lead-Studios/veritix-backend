import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions } from "typeorm";
import { Event } from "../events/entities/event.entity";
import { EventGallery } from "./entities/event-gallery.entity";
import {
  CreateEventGalleryDto,
  UpdateEventGalleryDto,
} from "./dto/event-gallery.dto";

@Injectable()
export class EventGalleryService {
  constructor(
    @InjectRepository(EventGallery)
    private galleryRepository: Repository<EventGallery>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async createGalleryImage(
    createGalleryDto: CreateEventGalleryDto,
  ): Promise<EventGallery> {
    // Check if event exists
    const event = await this.eventRepository.findOne({
      where: { id: createGalleryDto.eventId },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Check maximum gallery images limit
    const existingGalleryImages = await this.galleryRepository.count({
      where: { eventId: createGalleryDto.eventId },
    });

    if (existingGalleryImages >= 10) {
      throw new BadRequestException(
        "Maximum of 10 images per event gallery reached",
      );
    }

    const galleryImage = this.galleryRepository.create({
      ...createGalleryDto,
      event,
    });

    return this.galleryRepository.save(galleryImage);
  }

  async getAllImages(page = 1, limit = 10): Promise<EventGallery[]> {
    const options: FindManyOptions<EventGallery> = {
      take: limit,
      skip: (page - 1) * limit,
      relations: ["event"],
    };

    return this.galleryRepository.find(options);
  }

  async getImageById(id: string): Promise<EventGallery> {
    const image = await this.galleryRepository.findOne({
      where: { id },
      relations: ["event"],
    });

    if (!image) {
      throw new NotFoundException("Image not found");
    }

    return image;
  }

  async getEventGallery(
    eventId: string,
    page = 1,
    limit = 10,
  ): Promise<EventGallery[]> {
    // Verify event exists
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return this.galleryRepository.find({
      where: { eventId },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async updateImageDescription(
    id: string,
    updateGalleryDto: UpdateEventGalleryDto,
  ): Promise<EventGallery> {
    const image = await this.getImageById(id);

    image.description = updateGalleryDto.description;

    return this.galleryRepository.save(image);
  }

  async deleteImage(id: string): Promise<void> {
    const result = await this.galleryRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException("Image not found");
    }
  }
}
