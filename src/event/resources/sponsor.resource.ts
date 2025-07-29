import { Sponsor } from '../entities/sponsor.entity';

export class SponsorResource {
  static toResponse(sponsor: Sponsor) {
    return {
      id: sponsor.id,
      brandImage: sponsor.brandImage,
      brandName: sponsor.brandName,
      brandWebsite: sponsor.brandWebsite,
      facebook: sponsor.facebook,
      twitter: sponsor.twitter,
      instagram: sponsor.instagram,
      eventId: sponsor.event?.id || null,
    };
  }

  static toArray(sponsors: Sponsor[]) {
    return sponsors.map(this.toResponse);
  }
}
