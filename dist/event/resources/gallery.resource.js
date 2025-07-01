"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryResource = void 0;
class GalleryResource {
    static toResponse(image) {
        return {
            id: image.id,
            imageUrl: image.imageUrl,
            description: image.description,
            eventId: image.event?.id,
            createdAt: image['createdAt'],
            updatedAt: image['updatedAt'],
        };
    }
    static toArray(images) {
        return images.map(GalleryResource.toResponse);
    }
}
exports.GalleryResource = GalleryResource;
//# sourceMappingURL=gallery.resource.js.map