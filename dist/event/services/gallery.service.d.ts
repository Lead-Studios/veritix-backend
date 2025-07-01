import { Repository } from 'typeorm';
import { GalleryImage } from '../entities/gallery-image.entity';
import { CreateGalleryImageDto, UpdateGalleryImageDto } from '../dtos/gallery.dto';
import { Event } from '../entities/event.entity';
export declare class GalleryService {
    private readonly galleryRepo;
    private readonly eventRepo;
    constructor(galleryRepo: Repository<GalleryImage>, eventRepo: Repository<Event>);
    create(dto: CreateGalleryImageDto): Promise<GalleryImage>;
    findAll(): Promise<GalleryImage[]>;
    findOne(id: string): Promise<GalleryImage>;
    findByEvent(eventId: string): Promise<GalleryImage[]>;
    update(id: string, dto: UpdateGalleryImageDto): Promise<GalleryImage>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
