import { BadRequestException } from '@nestjs/common';
import { Event } from '../entities/event.entity';

export function validateForPublish(event: Event) {
  if (event.eventDate >= event.eventClosingDate) {
    throw new BadRequestException(
      'Event date must be before closing date',
    );
  }

  if (event.capacity < 1) {
    throw new BadRequestException(
      'Event capacity must be greater than zero',
    );
  }

  if (event.eventComingSoon) {
    throw new BadRequestException(
      'Event marked as coming soon cannot be published',
    );
  }

  if (event.eventDate < new Date()) {
    throw new BadRequestException(
      'Cannot publish an event in the past',
    );
  }
}
