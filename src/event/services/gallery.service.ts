import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalleryImage } from '../entities/gallery-image.entity';
import { CreateGalleryImageDto, UpdateGalleryImageDto } from '../dtos/gallery.dto';
import { Event } from '../entities/event.entity';

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryImage)
    private readonly galleryRepo: Repository<GalleryImage>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(dto: CreateGalleryImageDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId }, relations: ['images'] });
    if (!event) throw new NotFoundException('Event not found');
    if (event.images.length >= 10) throw new BadRequestException('Maximum 10 images per event');
    const image = this.galleryRepo.create({
      imageUrl: dto.imageUrl,
      description: dto.description,
      event,
    });
    return this.galleryRepo.save(image);
  }

  async findAll() {
    return this.galleryRepo.find({ relations: ['event'] });
  }

  async findOne(id: string) {
    const image = await this.galleryRepo.findOne({ where: { id }, relations: ['event'] });
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }

  async findByEvent(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId }, relations: ['images'] });
    if (!event) throw new NotFoundException('Event not found');
    return event.images;
  }

  async update(id: string, dto: UpdateGalleryImageDto) {
    const image = await this.galleryRepo.findOne({ where: { id } });
    if (!image) throw new NotFoundException('Image not found');
    image.description = dto.description;
    return this.galleryRepo.save(image);
  }

  async remove(id: string) {
    const image = await this.galleryRepo.findOne({ where: { id } });
    if (!image) throw new NotFoundException('Image not found');
    await this.galleryRepo.remove(image);
    return { deleted: true };
  }
} 