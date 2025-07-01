import { Repository } from 'typeorm';
import { GalleryImage } from '../entities/gallery-image.entity';
import { CreateGalleryImageDto, UpdateGalleryImageDto } from '../dtos/gallery.dto';
import { Event } from '../entities/event.entity';
export declare class GalleryService {
    private readonly galleryRepo;
    private readonly eventRepo;
    constructor(galleryRepo: Repository<GalleryImage>, eventRepo: Repository<Event>);
    create(dto: CreateGalleryImageDto): Promise<{
        id: string;
        imageUrl: string;
        description: string;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        id: string;
        imageUrl: string;
        description: string;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        imageUrl: string;
        description: string;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findByEvent(eventId: string): Promise<{
        id: string;
        imageUrl: string;
        description: string;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    update(id: string, dto: UpdateGalleryImageDto): Promise<{
        id: string;
        imageUrl: string;
        description: string;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
