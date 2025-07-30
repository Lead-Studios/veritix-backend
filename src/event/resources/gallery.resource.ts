import { GalleryImage } from '../entities/gallery-image.entity';

export class GalleryResource {
  static toResponse(image: GalleryImage) {
    return {
      id: image.id,
      imageUrl: image.imageUrl,
      description: image.description,
      eventId: image.event?.id,
      createdAt: image['createdAt'],
      updatedAt: image['updatedAt'],
    };
  }

  static toArray(images: GalleryImage[]) {
    return images.map(GalleryResource.toResponse);
  }
}
