import { Controller, Get, Param, ForbiddenException } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import type { OrganizerEventsResponse } from '../dto/event.dto';

@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Get(':id/events')
  getOrganizerEvents(
    @Param('id') organizerId: string,
  ): OrganizerEventsResponse {
    // In a real app, we'd get the current user from authentication context
    // For now, we'll assume the organizerId is provided and check authorization
    const currentUserId = organizerId; // This would come from JWT token or session

    if (currentUserId !== organizerId) {
      throw new ForbiddenException('You can only access your own events');
    }

    return this.organizerService.getOrganizerEvents(organizerId);
  }
}
