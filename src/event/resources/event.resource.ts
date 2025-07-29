import { Event } from '../../events/entities/event.entity';

export class EventResource {
  static toResponse(event: Event) {
    return {
      id: event.id,
      name: event.name,
      images: event.galleryImages ? event.galleryImages.map(img => img.id) : [],
    };
  }

  static toArray(events: Event[]) {
    return events.map(EventResource.toResponse);
  }
} 