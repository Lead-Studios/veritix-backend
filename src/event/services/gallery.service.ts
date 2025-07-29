import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GalleryImage } from '../entities/gallery-image.entity';
import { CreateGalleryImageDto, UpdateGalleryImageDto } from '../dtos/gallery.dto';
import { Event } from '../../events/entities/event.entity';
import { GalleryResource } from '../resources/gallery.resource';

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryImage)
    private readonly galleryRepo: Repository<GalleryImage>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(dto: CreateGalleryImageDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId }, relations: ['galleryImages'] });
    if (!event) throw new NotFoundException('Event not found');
    if (event.galleryImages.length >= 10) throw new BadRequestException('Maximum 10 images per event');
    const image = this.galleryRepo.create({
      imageUrl: dto.imageUrl,
      description: dto.description,
      event,
    });
    const saved = await this.galleryRepo.save(image);
    return GalleryResource.toResponse(saved);
  }

  async findAll() {
    const images = await this.galleryRepo.find({ relations: ['event'] });
    return GalleryResource.toArray(images);
  }

  async findOne(id: string) {
    const image = await this.galleryRepo.findOne({ where: { id }, relations: ['event'] });
    if (!image) throw new NotFoundException('Image not found');
    return GalleryResource.toResponse(image);
  }

  async findByEvent(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId }, relations: ['galleryImages'] });
    if (!event) throw new NotFoundException('Event not found');
    return GalleryResource.toArray(event.galleryImages);
  }

  async update(id: string, dto: UpdateGalleryImageDto) {
    const image = await this.galleryRepo.findOne({ where: { id } });
    if (!image) throw new NotFoundException('Image not found');
    image.description = dto.description;
    const saved = await this.galleryRepo.save(image);
    return GalleryResource.toResponse(saved);
  }

  async remove(id: string) {
    const image = await this.galleryRepo.findOne({ where: { id } });
    if (!image) throw new NotFoundException('Image not found');
    await this.galleryRepo.remove(image);
    return { deleted: true };
  }
} 