import { SpecialGuest } from '../entities/special-guest.entity';

export class SpecialGuestResource {
  static toResponse(guest: SpecialGuest) {
    return {
      id: guest.id,
      image: guest.image,
      event: guest.event
        ? { id: guest.event.id, name: guest.event.name }
        : null,
      name: guest.name,
      facebook: guest.facebook,
      twitter: guest.twitter,
      instagram: guest.instagram,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
    };
  }

  static toArray(guests: SpecialGuest[]) {
    return guests.map(SpecialGuestResource.toResponse);
  }
}
