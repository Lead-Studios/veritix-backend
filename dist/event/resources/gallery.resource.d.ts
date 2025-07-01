import { GalleryImage } from '../entities/gallery-image.entity';
export declare class GalleryResource {
    static toResponse(image: GalleryImage): {
        id: string;
        imageUrl: string;
        description: string;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    };
    static toArray(images: GalleryImage[]): {
        id: string;
        imageUrl: string;
        description: string;
        eventId: string;
        createdAt: Date;
        updatedAt: Date;
    }[];
}
