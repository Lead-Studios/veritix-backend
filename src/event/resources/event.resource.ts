import { Event } from '../entities/event.entity';

export class EventResource {
  static toResponse(event: Event) {
    return {
      id: event.id,
      name: event.name,
      images: event.images ? event.images.map(img => img.id) : [],
    };
  }

  static toArray(events: Event[]) {
    return events.map(EventResource.toResponse);
  }
} 