import { GalleryService } from '../services/gallery.service';
import { CreateGalleryImageDto, UpdateGalleryImageDto } from '../dtos/gallery.dto';
export declare class GalleryController {
    private readonly galleryService;
    constructor(galleryService: GalleryService);
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
