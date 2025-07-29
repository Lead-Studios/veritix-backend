import { Event } from '../../events/entities/event.entity';

export class EventResource {
  static toResponse(event: Event) {
    return {
      id: event.id,
      name: event.name,
      archived: event['archived'],
      createdAt: event['createdAt'],
      updatedAt: event['updatedAt'],
    };
  }

  static toArray(events: Event[]) {
    return events.map(EventResource.toResponse);
  }
} 