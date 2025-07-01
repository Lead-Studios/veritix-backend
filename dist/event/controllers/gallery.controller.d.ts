import { GalleryService } from '../services/gallery.service';
import { CreateGalleryImageDto, UpdateGalleryImageDto } from '../dtos/gallery.dto';
export declare class GalleryController {
    private readonly galleryService;
    constructor(galleryService: GalleryService);
    create(dto: CreateGalleryImageDto): Promise<import("../entities/gallery-image.entity").GalleryImage>;
    findAll(): Promise<import("../entities/gallery-image.entity").GalleryImage[]>;
    findOne(id: string): Promise<import("../entities/gallery-image.entity").GalleryImage>;
    findByEvent(eventId: string): Promise<import("../entities/gallery-image.entity").GalleryImage[]>;
    update(id: string, dto: UpdateGalleryImageDto): Promise<import("../entities/gallery-image.entity").GalleryImage>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
